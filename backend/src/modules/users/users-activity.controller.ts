import type { Request, Response } from 'express';
import { prisma } from '../../lib/prisma';
import { sendSuccess } from '../../utils/response';

export async function getUserActivityController(req: Request, res: Response) {
  const targetUserId = req.params.id as string;

  const logs = await prisma.auditLog.findMany({
    where: {
      OR: [
        { userId: targetUserId },
        { entityId: targetUserId },
        {
          metadata: {
            string_contains: `"targetUserId":"${targetUserId}"`,
          },
        },
        {
          metadata: {
            string_contains: `"actorUserId":"${targetUserId}"`,
          },
        },
      ],
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  sendSuccess(res, logs);
}

export async function getSelfActivityController(req: Request, res: Response) {
  const userId = req.authUser!.id;

  const logs = await prisma.auditLog.findMany({
    where: {
      OR: [
        { userId },
        { entityId: userId },
        {
          metadata: {
            string_contains: `"targetUserId":"${userId}"`,
          },
        },
        {
          metadata: {
            string_contains: `"actorUserId":"${userId}"`,
          },
        },
      ],
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  sendSuccess(res, logs);
}

export async function getUsersAccessSummaryController(_req: Request, res: Response) {
  const users = await prisma.user.findMany({
    include: {
      role: {
        include: {
          rolePermissions: {
            include: { permission: true },
          },
        },
      },
      permissionOverrides: {
        where: {
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        },
        include: { permission: true },
      },
      dataScopes: true,
    },
  });

  const summaries = await Promise.all(
    users.map(async (user) => {
      const rolePermissionKeys = user.role.rolePermissions.map(rp => rp.permission.key);
      const allowedKeys = user.permissionOverrides.filter(o => o.effect === 'ALLOW').map(o => o.permission.key);
      const deniedKeys = user.permissionOverrides.filter(o => o.effect === 'DENY').map(o => o.permission.key);
      const deniedSet = new Set(deniedKeys);
      const combined = new Set(rolePermissionKeys);
      for (const k of allowedKeys) combined.add(k);
      for (const k of deniedKeys) combined.delete(k);

      const recentActivity = await prisma.auditLog.findFirst({
        where: {
          OR: [
            { userId: user.id },
            { entityId: user.id },
            { metadata: { string_contains: `"targetUserId":"${user.id}"` } },
          ],
        },
        orderBy: { createdAt: 'desc' },
        select: { action: true, createdAt: true },
      });

      return {
        userId: user.id,
        effectivePermissionsCount: combined.size,
        dataScopesCount: user.dataScopes.length,
        overridesCount: user.permissionOverrides.length,
        recentActivityAction: recentActivity?.action ?? null,
        recentActivityAt: recentActivity?.createdAt.toISOString() ?? null,
      };
    }),
  );

  sendSuccess(res, summaries);
}
