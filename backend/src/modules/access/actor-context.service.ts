import { prisma } from '../../lib/prisma';
import { getEffectivePermissions } from './effective-permissions.service';
import type { RequestUser } from '../../types/auth';

export type DataScopeEntry = {
  id: string;
  scopeType: string;
  scopeId: string | null;
  accessLevel: string;
  expiresAt: Date | null;
};

export type ActorContext = {
  user: RequestUser;
  roleKey: string;
  isSuperAdmin: boolean;
  isAdmin: boolean;
  isGlobalUser: boolean;
  effectivePermissions: string[];
  dataScopes: DataScopeEntry[];
};

export async function getActorContext(userId: string): Promise<ActorContext> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      role: true,
      dataScopes: {
        where: {
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        },
      },
    },
  });

  if (!user) {
    throw new Error('User not found');
  }

  const effectivePerms = await getEffectivePermissions(userId);
  const roleKey = user.role.key;
  const isSuperAdmin = roleKey === 'super_admin';
  const isAdmin = roleKey === 'admin';
  const isGlobalUser = isSuperAdmin || isAdmin;

  return {
    user: {
      id: user.id,
      name: user.name,
      username: user.username,
      email: user.email,
      mobile: user.mobile,
      status: user.status,
      role: {
        id: user.role.id,
        name: user.role.name,
        key: user.role.key,
        status: user.role.status,
      },
    },
    roleKey,
    isSuperAdmin,
    isAdmin,
    isGlobalUser,
    effectivePermissions: effectivePerms.effectivePermissions,
    dataScopes: user.dataScopes.map(ds => ({
      id: ds.id,
      scopeType: ds.scopeType,
      scopeId: ds.scopeId,
      accessLevel: ds.accessLevel,
      expiresAt: ds.expiresAt,
    })),
  };
}
