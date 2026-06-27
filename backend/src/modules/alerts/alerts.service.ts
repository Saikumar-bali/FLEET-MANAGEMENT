import { AlertModule, AlertStatus, Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../utils/appError';
import type { AlertWithRule } from './alerts.types';
import type {
  BulkResolveInput,
  ListAlertsQuery,
  ListAlertRulesQuery,
  UpdateAlertRuleInput,
} from './alerts.validators';

const ALERT_INCLUDE = {
  rule: { select: { key: true, title: true, description: true } },
} satisfies Prisma.AlertInclude;

export type AlertScope = {
  roleKey?: string | null;
  userDriverId?: string | null;
};

async function driverScopeWhere(scope: AlertScope): Promise<Prisma.AlertWhereInput | undefined> {
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

function dateRange(dateFrom?: string, dateTo?: string): Prisma.DateTimeFilter | undefined {
  if (!dateFrom && !dateTo) return undefined;
  return {
    ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
    ...(dateTo ? { lte: new Date(dateTo) } : {}),
  };
}

export async function listAlerts(scope: AlertScope, query: ListAlertsQuery) {
  const scopeWhere = (await driverScopeWhere(scope)) ?? {};
  const where: Prisma.AlertWhereInput = {
    ...scopeWhere,
    ...(query.status ? { status: query.status } : {}),
    ...(query.module ? { module: query.module } : {}),
    ...(query.severity ? { severity: query.severity } : {}),
    ...(query.vehicleId ? { vehicleId: query.vehicleId } : {}),
    ...(query.driverId ? { driverId: query.driverId } : {}),
    ...(query.tripId ? { tripId: query.tripId } : {}),
    ...(query.entityType ? { entityType: query.entityType } : {}),
    ...(query.search
      ? {
          OR: [
            { title: { contains: query.search, mode: 'insensitive' } },
            { message: { contains: query.search, mode: 'insensitive' } },
          ],
        }
      : {}),
    ...(() => {
      const range = dateRange(query.dateFrom, query.dateTo);
      return range ? { detectedAt: range } : {};
    })(),
  };

  const [items, total] = await Promise.all([
    prisma.alert.findMany({
      where,
      orderBy: [{ severity: 'desc' }, { detectedAt: 'desc' }],
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      include: ALERT_INCLUDE,
    }),
    prisma.alert.count({ where }),
  ]);

  return {
    items: items as unknown as AlertWithRule[],
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.limit)),
    },
  };
}

export async function getAlert(scope: AlertScope, id: string) {
  const alert = await prisma.alert.findUnique({
    where: { id },
    include: ALERT_INCLUDE,
  });
  if (!alert) throw new AppError('Alert not found', 404);
  if (scope.roleKey === 'driver' || scope.roleKey === 'assistant_driver') {
    const driverId = scope.userDriverId ?? null;
    const isSystem = alert.module === AlertModule.SYSTEM;
    const isOwnTrip =
      alert.module === AlertModule.TRIP &&
      driverId &&
      (await prisma.trip.findFirst({
        where: { id: alert.tripId ?? '', OR: [{ driverId }, { assistantDriverId: driverId }] },
        select: { id: true },
      }));
    const isOwnDriver = alert.module === AlertModule.DRIVER && alert.driverId === driverId;
    if (!isSystem && !isOwnTrip && !isOwnDriver) {
      throw new AppError('Alert not found', 404);
    }
  }
  return alert as unknown as AlertWithRule;
}

export async function markRead(scope: AlertScope, id: string, userId: string) {
  const alert = await getAlert(scope, id);
  if (alert.status === AlertStatus.RESOLVED || alert.status === AlertStatus.DISMISSED) {
    throw new AppError('Alert already closed', 409);
  }
  return prisma.alert.update({
    where: { id },
    data: { status: AlertStatus.READ, readAt: new Date() },
    include: ALERT_INCLUDE,
  });
}

async function close(scope: AlertScope, id: string, status: AlertStatus, userId: string) {
  await getAlert(scope, id);
  return prisma.alert.update({
    where: { id },
    data: {
      status,
      resolvedAt: new Date(),
      resolvedById: userId ?? null,
    },
    include: ALERT_INCLUDE,
  });
}

export function resolveAlert(scope: AlertScope, id: string, userId: string) {
  return close(scope, id, AlertStatus.RESOLVED, userId);
}

export function dismissAlert(scope: AlertScope, id: string, userId: string) {
  return close(scope, id, AlertStatus.DISMISSED, userId);
}

export async function bulkResolve(scope: AlertScope, input: BulkResolveInput, userId: string) {
  const scopeWhere = (await driverScopeWhere(scope)) ?? {};
  const matched = await prisma.alert.findMany({
    where: { ...scopeWhere, id: { in: input.ids } },
    select: { id: true },
  });
  if (matched.length === 0) {
    return { updated: 0 };
  }
  const matchedIds = matched.map((m) => m.id);
  const now = new Date();
  if (input.action === 'read') {
    const result = await prisma.alert.updateMany({
      where: { id: { in: matchedIds }, status: AlertStatus.UNREAD },
      data: { status: AlertStatus.READ, readAt: now },
    });
    return { updated: result.count };
  }
  const status = input.action === 'resolve' ? AlertStatus.RESOLVED : AlertStatus.DISMISSED;
  const result = await prisma.alert.updateMany({
    where: { id: { in: matchedIds } },
    data: { status, resolvedAt: now, resolvedById: userId ?? null },
  });
  return { updated: result.count };
}

export async function listAlertRules(query: ListAlertRulesQuery) {
  const where: Prisma.AlertRuleWhereInput = {
    ...(query.module ? { module: query.module } : {}),
    ...(typeof query.isActive === 'boolean' ? { isActive: query.isActive } : {}),
    ...(query.search
      ? {
          OR: [
            { key: { contains: query.search, mode: 'insensitive' } },
            { title: { contains: query.search, mode: 'insensitive' } },
            { description: { contains: query.search, mode: 'insensitive' } },
          ],
        }
      : {}),
  };
  const [items, total] = await Promise.all([
    prisma.alertRule.findMany({
      where,
      orderBy: [{ module: 'asc' }, { title: 'asc' }],
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }),
    prisma.alertRule.count({ where }),
  ]);
  return {
    items,
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.limit)),
    },
  };
}

export async function getAlertRule(id: string) {
  const rule = await prisma.alertRule.findUnique({ where: { id } });
  if (!rule) throw new AppError('Alert rule not found', 404);
  return rule;
}

export async function updateAlertRule(id: string, input: UpdateAlertRuleInput) {
  await getAlertRule(id);
  return prisma.alertRule.update({
    where: { id },
    data: {
      ...(input.severity ? { severity: input.severity } : {}),
      ...(typeof input.isActive === 'boolean' ? { isActive: input.isActive } : {}),
      ...(input.thresholdDays !== undefined ? { thresholdDays: input.thresholdDays } : {}),
      ...(input.thresholdValue !== undefined ? { thresholdValue: input.thresholdValue } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
    },
  });
}