import { AlertModule, AlertStatus, Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import type { AlertSummary, AlertWithRule } from './alerts.types';

const ALERT_INCLUDE = {
  rule: { select: { key: true, title: true, description: true } },
} satisfies Prisma.AlertInclude;

type Scope = {
  roleKey?: string | null;
  userDriverId?: string | null;
};

async function scopeFilter(scope: Scope): Promise<Prisma.AlertWhereInput | undefined> {
  if (!scope.roleKey) return undefined;
  if (scope.roleKey !== 'driver' && scope.roleKey !== 'assistant_driver') {
    return undefined;
  }
  const driverId = scope.userDriverId ?? null;
  if (!driverId) {
    return { module: AlertModule.SYSTEM };
  }
  const tripIds = await prisma.trip.findMany({
    where: {
      OR: [{ driverId }, { assistantDriverId: driverId }],
    },
    select: { id: true },
  });
  const tripIdList = tripIds.map((t) => t.id);
  return {
    OR: [
      { module: AlertModule.SYSTEM },
      ...(tripIdList.length > 0
        ? [{ module: AlertModule.TRIP, tripId: { in: tripIdList } }]
        : []),
      { module: AlertModule.DRIVER, driverId },
    ],
  };
}

export async function getAlertSummary(scope: Scope): Promise<AlertSummary> {
  const where = (await scopeFilter(scope)) ?? {};
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfWeek = new Date(now.getTime() + 7 * 86400000);

  const [unreadCount, criticalCount, warningCount, infoCount, resolvedToday, byModuleRaw, recent, dueSoon] =
    await Promise.all([
      prisma.alert.count({ where: { ...where, status: AlertStatus.UNREAD } }),
      prisma.alert.count({ where: { ...where, severity: 'CRITICAL' } }),
      prisma.alert.count({ where: { ...where, severity: 'WARNING' } }),
      prisma.alert.count({ where: { ...where, severity: 'INFO' } }),
      prisma.alert.count({
        where: {
          ...where,
          resolvedAt: { gte: startOfDay },
          status: { in: [AlertStatus.RESOLVED, AlertStatus.DISMISSED] },
        },
      }),
      prisma.alert.groupBy({
        by: ['module'],
        where,
        _count: { _all: true },
      }),
      prisma.alert.findMany({
        where,
        orderBy: [{ severity: 'desc' }, { detectedAt: 'desc' }],
        take: 5,
        include: ALERT_INCLUDE,
      }),
      prisma.alert.findMany({
        where: {
          ...where,
          status: { in: [AlertStatus.UNREAD, AlertStatus.READ] },
          detectedAt: { lte: endOfWeek },
        },
        orderBy: [{ severity: 'desc' }, { detectedAt: 'asc' }],
        take: 5,
        include: ALERT_INCLUDE,
      }),
    ]);

  const byModule = byModuleRaw.map((row) => ({
    module: row.module as AlertModule,
    count: row._count._all,
  }));

  return {
    unreadCount,
    criticalCount,
    warningCount,
    infoCount,
    resolvedToday,
    byModule,
    recentAlerts: recent as unknown as AlertWithRule[],
    dueSoonAlerts: dueSoon as unknown as AlertWithRule[],
  };
}