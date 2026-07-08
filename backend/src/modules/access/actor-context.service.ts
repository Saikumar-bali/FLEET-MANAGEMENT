import { prisma } from '../../lib/prisma';
import { getEffectivePermissions } from './effective-permissions.service';
import type { RequestUser } from '../../types/auth';
import { AppError } from '../../utils/appError';

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

type PreloadedUser = {
  id: string;
  name: string;
  username: string | null;
  email: string;
  mobile: string | null;
  status: string;
  role: {
    id: string;
    name: string;
    key: string;
    status: string;
  };
  dataScopes: {
    id: string;
    scopeType: string;
    scopeId: string | null;
    accessLevel: string;
    expiresAt: Date | null;
  }[];
};

export async function getActorContext(userId: string, preloadedUser?: PreloadedUser): Promise<ActorContext> {
  const user = preloadedUser ?? await prisma.user.findUnique({
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
    throw new AppError('User not found', 404);
  }

  const effectivePerms = await getEffectivePermissions(userId);
  const roleKey = user.role.key;
  const isSuperAdmin = roleKey === 'super_admin';
  const isAdmin = roleKey === 'admin';

  const dataScopes: DataScopeEntry[] = user.dataScopes.map(ds => ({
    id: ds.id,
    scopeType: ds.scopeType,
    scopeId: ds.scopeId,
    accessLevel: ds.accessLevel,
    expiresAt: ds.expiresAt,
  }));

  const hasGlobalManageScope = dataScopes.some(
    ds => ds.scopeType === 'GLOBAL' && ds.accessLevel === 'MANAGE',
  );

  const isGlobalUser = isSuperAdmin || hasGlobalManageScope;

  return {
    user: {
      id: user.id,
      name: user.name,
      username: user.username,
      email: user.email,
      mobile: user.mobile,
      status: user.status as 'ACTIVE' | 'INACTIVE' | 'SUSPENDED',
      role: {
        id: user.role.id,
        name: user.role.name,
        key: user.role.key,
        status: user.role.status as 'ACTIVE' | 'INACTIVE',
      },
    },
    roleKey,
    isSuperAdmin,
    isAdmin,
    isGlobalUser,
    effectivePermissions: effectivePerms.effectivePermissions,
    dataScopes,
  };
}

export function canAccessGlobal(actor: ActorContext, permissionKey?: string, scopeType?: string): boolean {
  if (actor.isSuperAdmin) return true;

  if (permissionKey && !actor.effectivePermissions.includes(permissionKey)) {
    return false;
  }

  if (scopeType) {
    return actor.dataScopes.some(
      ds => ds.scopeType === scopeType && ds.accessLevel === 'MANAGE',
    );
  }

  return actor.dataScopes.some(
    ds => ds.scopeType === 'GLOBAL' && ds.accessLevel === 'MANAGE',
  );
}
