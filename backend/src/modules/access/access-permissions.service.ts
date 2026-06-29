import { prisma } from '../../lib/prisma';
import { AppError } from '../../utils/appError';
import type { PermissionOverrideEffect, DataScopeType, DataScopeAccessLevel } from '@prisma/client';
import { getActorContext } from './actor-context.service';
import { assertCanGrantPermission, assertCanGrantScope } from './access-policy.service';
import { recordAccessActivity } from './access-activity.service';

const VALID_SCOPE_TYPES = ['OWN', 'USER', 'DRIVER', 'VEHICLE', 'TRIP', 'ASSET', 'CUSTOMER', 'VENDOR', 'BRANCH', 'DEPARTMENT', 'FINANCE', 'GLOBAL'];
const VALID_ACCESS_LEVELS = ['VIEW', 'CREATE', 'UPDATE', 'DELETE', 'MANAGE'];
const SCOPE_TYPES_REQUIRING_ID = VALID_SCOPE_TYPES.filter(t => t !== 'OWN' && t !== 'GLOBAL');

export async function setPermissionOverride(
  actorId: string,
  targetUserId: string,
  permissionKey: string,
  effect: PermissionOverrideEffect,
  reason?: string,
  expiresAt?: Date,
) {
  const actor = await getActorContext(actorId);
  const targetUser = await prisma.user.findUnique({ where: { id: targetUserId } });
  if (!targetUser) {
    throw new AppError('Target user not found', 404);
  }

  await assertCanGrantPermission(actor, targetUserId, permissionKey);

  const permission = await prisma.permission.findFirst({ where: { key: permissionKey } });
  if (!permission) {
    throw new AppError(`Permission not found: ${permissionKey}`, 404);
  }

  const result = await prisma.userPermissionOverride.upsert({
    where: {
      userId_permissionId: { userId: targetUserId, permissionId: permission.id },
    },
    create: {
      userId: targetUserId,
      permissionId: permission.id,
      effect,
      reason,
      expiresAt,
      grantedById: actorId,
    },
    update: {
      effect,
      reason,
      expiresAt,
      grantedById: actorId,
    },
  });

  await recordAccessActivity({
    actorId,
    action: effect === 'DENY' ? 'admin.user.permission.deny' : 'admin.user.permission.allow',
    entityType: 'user_permission_override',
    entityId: result.id,
    targetUserId,
    details: { actorUserId: actorId, targetUserId, permissionKey, effect, reason, expiresAt },
  });

  return result;
}

export async function removePermissionOverride(
  actorId: string,
  targetUserId: string,
  permissionId: string,
) {
  const actor = await getActorContext(actorId);
  if (actor.user.id === targetUserId && !actor.isSuperAdmin) {
    throw new AppError('Cannot modify own permission overrides unless super_admin', 403);
  }

  const permission = await prisma.permission.findUnique({ where: { id: permissionId } });
  if (!permission) {
    throw new AppError('Permission not found', 404);
  }

  const existingOverride = await prisma.userPermissionOverride.findUnique({
    where: { userId_permissionId: { userId: targetUserId, permissionId } },
  });

  await prisma.userPermissionOverride.deleteMany({
    where: { userId: targetUserId, permissionId },
  });

  await recordAccessActivity({
    actorId,
    action: 'admin.user.permission.remove',
    entityType: 'user_permission_override',
    entityId: existingOverride?.id ?? targetUserId,
    targetUserId,
    details: { actorUserId: actorId, targetUserId, permissionKey: permission.key },
  });
}

export async function listPermissionOverrides(targetUserId: string) {
  return prisma.userPermissionOverride.findMany({
    where: { userId: targetUserId },
    include: { permission: true, grantedBy: { select: { id: true, name: true } } },
  });
}

export async function grantDataScope(
  actorId: string,
  targetUserId: string,
  scopeType: DataScopeType,
  accessLevel: DataScopeAccessLevel,
  scopeId?: string,
  reason?: string,
  expiresAt?: Date,
) {
  const actor = await getActorContext(actorId);
  const targetUser = await prisma.user.findUnique({ where: { id: targetUserId } });
  if (!targetUser) {
    throw new AppError('Target user not found', 404);
  }

  if (!VALID_SCOPE_TYPES.includes(scopeType)) {
    throw new AppError(`Invalid scopeType: ${scopeType}`, 400);
  }
  if (!VALID_ACCESS_LEVELS.includes(accessLevel)) {
    throw new AppError(`Invalid accessLevel: ${accessLevel}`, 400);
  }

  if (SCOPE_TYPES_REQUIRING_ID.includes(scopeType) && !scopeId) {
    throw new AppError(`scopeId is required for ${scopeType} scope type`, 400);
  }

  await assertCanGrantScope(actor, targetUserId, scopeType, accessLevel);

  const result = await prisma.userDataScope.create({
    data: {
      userId: targetUserId,
      scopeType,
      scopeId,
      accessLevel,
      reason,
      expiresAt,
      grantedById: actorId,
    },
  });

  await recordAccessActivity({
    actorId,
    action: 'admin.user.scope.grant',
    entityType: 'user_data_scope',
    entityId: result.id,
    targetUserId,
    details: { actorUserId: actorId, targetUserId, scopeType, scopeId, accessLevel, reason, expiresAt },
  });

  return result;
}

export async function removeDataScope(
  actorId: string,
  scopeId: string,
) {
  const scope = await prisma.userDataScope.findUnique({ where: { id: scopeId } });
  if (!scope) {
    throw new AppError('Data scope not found', 404);
  }

  await prisma.userDataScope.delete({ where: { id: scopeId } });

  await recordAccessActivity({
    actorId,
    action: 'admin.user.scope.remove',
    entityType: 'user_data_scope',
    entityId: scope.id,
    targetUserId: scope.userId,
    details: { actorUserId: actorId, targetUserId: scope.userId, scopeId, scopeType: scope.scopeType, accessLevel: scope.accessLevel },
  });
}

export async function listDataScopes(targetUserId: string) {
  return prisma.userDataScope.findMany({
    where: { userId: targetUserId },
    include: { grantedBy: { select: { id: true, name: true } } },
  });
}
