import { prisma } from '../../lib/prisma';
import type { PermissionOverrideEffect, DataScopeType, DataScopeAccessLevel } from '@prisma/client';

export async function setPermissionOverride(
  actorId: string,
  targetUserId: string,
  permissionId: string,
  effect: PermissionOverrideEffect,
  reason?: string,
  expiresAt?: Date,
) {
  if (actorId === targetUserId) {
    const actor = await prisma.user.findUnique({ where: { id: actorId }, include: { role: true } });
    if (!actor || actor.role.key !== 'super_admin') {
      throw new Error('Cannot modify own permission overrides unless super_admin');
    }
  }

  const permission = await prisma.permission.findUnique({ where: { id: permissionId } });
  if (!permission) throw new Error('Permission not found');

  return prisma.userPermissionOverride.upsert({
    where: {
      userId_permissionId: { userId: targetUserId, permissionId },
    },
    create: {
      userId: targetUserId,
      permissionId,
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
}

export async function removePermissionOverride(
  actorId: string,
  targetUserId: string,
  permissionId: string,
) {
  await prisma.userPermissionOverride.deleteMany({
    where: { userId: targetUserId, permissionId },
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
  return prisma.userDataScope.create({
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
}

export async function removeDataScope(scopeId: string) {
  await prisma.userDataScope.delete({ where: { id: scopeId } });
}

export async function listDataScopes(targetUserId: string) {
  return prisma.userDataScope.findMany({
    where: { userId: targetUserId },
    include: { grantedBy: { select: { id: true, name: true } } },
  });
}
