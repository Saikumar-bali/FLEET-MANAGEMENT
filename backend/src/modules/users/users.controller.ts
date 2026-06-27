import { Request, Response } from 'express';
import { sendSuccess } from '../../utils/response';
import { createAuditLog } from '../audit/audit.service';
import { getEffectivePermissions } from '../permissions/effective-permissions.service';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../utils/appError';
import {
  createUser,
  getUserById,
  linkDriverToUser,
  listUsers,
  unlinkDriverFromUser,
  updateUser,
  updateUserPassword,
  updateUserStatus,
} from './users.service';

export async function listUsersController(_req: Request, res: Response) {
  const users = await listUsers();
  return sendSuccess(res, users);
}

export async function getUserController(req: Request, res: Response) {
  const user = await getUserById(String(req.params.id));
  return sendSuccess(res, user);
}

export async function createUserController(req: Request, res: Response) {
  const user = await createUser(req.body);

  await createAuditLog(req, {
    userId: req.authUser?.id,
    action: 'user.create',
    entityType: 'user',
    entityId: user.id,
    metadata: { username: user.username, email: user.email, roleId: user.role.id },
  });

  return sendSuccess(res, user, 'User created successfully', 201);
}

export async function updateUserController(req: Request, res: Response) {
  const user = await updateUser({
    userId: String(req.params.id),
    currentUserId: req.authUser!.id,
    input: req.body,
  });

  await createAuditLog(req, {
    userId: req.authUser?.id,
    action: 'user.update',
    entityType: 'user',
    entityId: user.id,
    metadata: { username: user.username, roleId: user.role.id, status: user.status },
  });

  return sendSuccess(res, user, 'User updated successfully');
}

export async function updateUserStatusController(req: Request, res: Response) {
  const user = await updateUserStatus({
    userId: String(req.params.id),
    currentUserId: req.authUser!.id,
    status: req.body.status,
  });

  await createAuditLog(req, {
    userId: req.authUser?.id,
    action: 'user.update_status',
    entityType: 'user',
    entityId: user.id,
    metadata: { status: user.status },
  });

  return sendSuccess(res, user, 'User status updated successfully');
}

export async function updateUserPasswordController(req: Request, res: Response) {
  const result = await updateUserPassword(String(req.params.id), req.body.password);

  await createAuditLog(req, {
    userId: req.authUser?.id,
    action: 'user.update_password',
    entityType: 'user',
    entityId: result.id,
  });

  return sendSuccess(res, result, 'User password updated successfully');
}

export async function linkDriverController(req: Request, res: Response) {
  const user = await linkDriverToUser(String(req.params.id), req.body.driverId);

  await createAuditLog(req, {
    userId: req.authUser?.id,
    action: 'user.link_driver',
    entityType: 'user',
    entityId: user.id,
    metadata: { driverId: req.body.driverId },
  });

  return sendSuccess(res, user, 'Driver linked successfully');
}

export async function unlinkDriverController(req: Request, res: Response) {
  const user = await unlinkDriverFromUser(String(req.params.id));

  await createAuditLog(req, {
    userId: req.authUser?.id,
    action: 'user.unlink_driver',
    entityType: 'user',
    entityId: user.id,
  });

  return sendSuccess(res, user, 'Driver unlinked successfully');
}

export async function getUserEffectivePermissionsController(req: Request, res: Response) {
  const effective = await getEffectivePermissions(String(req.params.id));
  return sendSuccess(res, effective);
}

export async function getUserPermissionOverridesController(req: Request, res: Response) {
  const userId = String(req.params.id);

  const overrides = await prisma.userPermissionOverride.findMany({
    where: { userId },
    include: {
      permission: { select: { id: true, key: true, module: true, action: true, description: true } },
      grantedBy: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return sendSuccess(res, overrides);
}

export async function updateUserPermissionOverridesController(req: Request, res: Response) {
  const userId = String(req.params.id);
  const { allow, deny, expiresAt, reason } = req.body as {
    allow?: string[];
    deny?: string[];
    expiresAt?: string | null;
    reason?: string;
  };

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new AppError('User not found', 404);
  }

  // Delete all existing overrides for this user
  await prisma.userPermissionOverride.deleteMany({ where: { userId } });

  // Create ALLOW overrides
  if (allow && allow.length > 0) {
    const permissions = await prisma.permission.findMany({
      where: { key: { in: allow } },
    });
    const permissionMap = new Map(permissions.map((p) => [p.key, p.id]));

    const overrideData = allow
      .filter((key) => permissionMap.has(key))
      .map((key) => ({
        userId,
        permissionId: permissionMap.get(key)!,
        effect: 'ALLOW' as const,
        reason: reason || null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        grantedById: req.authUser?.id || null,
      }));

    if (overrideData.length > 0) {
      await prisma.userPermissionOverride.createMany({ data: overrideData });
    }
  }

  // Create DENY overrides
  if (deny && deny.length > 0) {
    const denyPermissions = await prisma.permission.findMany({
      where: { key: { in: deny } },
    });
    const denyPermissionMap = new Map(denyPermissions.map((p) => [p.key, p.id]));

    const denyData = deny
      .filter((key) => denyPermissionMap.has(key))
      .map((key) => ({
        userId,
        permissionId: denyPermissionMap.get(key)!,
        effect: 'DENY' as const,
        reason: reason || null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        grantedById: req.authUser?.id || null,
      }));

    if (denyData.length > 0) {
      await prisma.userPermissionOverride.createMany({ data: denyData });
    }
  }

  await createAuditLog(req, {
    userId: req.authUser?.id,
    action: 'user.update_permission_overrides',
    entityType: 'user',
    entityId: userId,
    metadata: { allow, deny, expiresAt, reason },
  });

  // Return updated effective permissions
  const effective = await getEffectivePermissions(userId);
  return sendSuccess(res, effective);
}
