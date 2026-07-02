import { Request, Response } from 'express';
import { AppError } from '../../utils/appError';
import { sendSuccess } from '../../utils/response';
import { prisma } from '../../lib/prisma';
import {
  setPermissionOverride,
  removePermissionOverride,
  listPermissionOverrides,
  grantDataScope,
  removeDataScope,
  listDataScopes,
} from './access-permissions.service';
import { getEffectivePermissions } from './effective-permissions.service';
import { getUserProfileLinks, getDriverIdForUser, getProfileTypesForUser } from '../user-profile-links/user-profile-links.service';

export async function effectivePermissionsController(req: Request, res: Response) {
  const userId = req.params.id as string || req.authUser!.id;
  const result = await getEffectivePermissions(userId);
  sendSuccess(res, result);
}

export async function selfEffectivePermissionsController(req: Request, res: Response) {
  const userId = req.authUser!.id;
  const result = await getEffectivePermissions(userId);
  sendSuccess(res, result);
}

export async function selfDataScopesController(req: Request, res: Response) {
  const userId = req.authUser!.id;
  const scopes = await listDataScopes(userId);
  sendSuccess(res, scopes);
}

export async function selfSummaryController(req: Request, res: Response) {
  const userId = req.authUser!.id;

  const user = await prisma.user.findUnique({
    where: { id: userId },
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

  if (!user) {
    throw new AppError('User not found', 404);
  }

  const rolePermissions = user.role.rolePermissions.map(rp => rp.permission.key);
  const userAllowedPermissions = user.permissionOverrides.filter(o => o.effect === 'ALLOW').map(o => o.permission.key);
  const userDeniedPermissions = user.permissionOverrides.filter(o => o.effect === 'DENY').map(o => o.permission.key);
  const deniedSet = new Set(userDeniedPermissions);
  const combined = new Set(rolePermissions);
  for (const k of userAllowedPermissions) combined.add(k);
  for (const k of userDeniedPermissions) combined.delete(k);
  const effectivePermissions = Array.from(combined);

  const recentActivity = await prisma.auditLog.findMany({
    where: {
      OR: [
        { userId },
        { entityId: userId },
        { metadata: { string_contains: `"targetUserId":"${userId}"` } },
        { metadata: { string_contains: `"actorUserId":"${userId}"` } },
      ],
    },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });

  // Profile links
  const profileLinks = await getUserProfileLinks(userId);
  const profileTypes = await getProfileTypesForUser(userId);
  const driverId = await getDriverIdForUser(userId);
  let primaryDriverProfile = null;

  if (driverId) {
    const driver = await prisma.driver.findUnique({
      where: { id: driverId },
      select: { id: true, name: true, mobile: true, status: true },
    });
    primaryDriverProfile = driver;
  }

  sendSuccess(res, {
    user: { id: user.id, name: user.name, email: user.email, username: user.username, status: user.status },
    role: { id: user.role.id, name: user.role.name, key: user.role.key },
    effectivePermissions,
    rolePermissions,
    userAllowedPermissions,
    userDeniedPermissions,
    dataScopes: user.dataScopes,
    recentActivity,
    profileLinks,
    primaryDriverProfile,
    profileTypes,
  });
}

export async function listPermissionOverridesController(req: Request, res: Response) {
  const id = req.params.id as string;
  const overrides = await listPermissionOverrides(id);
  sendSuccess(res, overrides);
}

export async function setPermissionOverrideController(req: Request, res: Response) {
  const id = req.params.id as string;
  const { permissionId, permissionKey, effect, reason, expiresAt } = req.body;

  if (!permissionKey && !permissionId) {
    throw new AppError('permissionKey or permissionId is required', 400);
  }

  if (!effect || !['ALLOW', 'DENY'].includes(effect)) {
    throw new AppError('effect must be ALLOW or DENY', 400);
  }

  let resolvedKey: string;
  if (permissionId) {
    const perm = await prisma.permission.findUnique({ where: { id: permissionId } });
    if (!perm) {
      throw new AppError('Permission not found', 404);
    }
    if (permissionKey && perm.key !== permissionKey) {
      throw new AppError('permissionId and permissionKey do not match', 400);
    }
    resolvedKey = perm.key;
  } else {
    resolvedKey = permissionKey;
  }

  const result = await setPermissionOverride(
    req.authUser!.id,
    id,
    resolvedKey,
    effect,
    reason,
    expiresAt ? new Date(expiresAt) : undefined,
  );

  sendSuccess(res, result, 'Permission override set');
}

export async function removePermissionOverrideController(req: Request, res: Response) {
  const id = req.params.id as string;
  const permissionId = req.params.permissionId as string;

  await removePermissionOverride(req.authUser!.id, id, permissionId);
  sendSuccess(res, null, 'Permission override removed');
}

export async function listDataScopesController(req: Request, res: Response) {
  const id = req.params.id as string;
  const scopes = await listDataScopes(id);
  sendSuccess(res, scopes);
}

export async function grantDataScopeController(req: Request, res: Response) {
  const id = req.params.id as string;
  const { scopeType, scopeId, accessLevel, reason, expiresAt } = req.body;

  if (!scopeType || !accessLevel) {
    throw new AppError('scopeType and accessLevel are required', 400);
  }

  const result = await grantDataScope(
    req.authUser!.id,
    id,
    scopeType,
    accessLevel,
    scopeId,
    reason,
    expiresAt ? new Date(expiresAt) : undefined,
  );

  sendSuccess(res, result, 'Data scope granted');
}

export async function removeDataScopeController(req: Request, res: Response) {
  const scopeId = req.params.scopeId as string;

  await removeDataScope(req.authUser!.id, scopeId);
  sendSuccess(res, null, 'Data scope removed');
}
