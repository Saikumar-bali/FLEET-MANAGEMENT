import { prisma } from '../../lib/prisma';

export type EffectivePermissionsResult = {
  rolePermissions: string[];
  userAllowedPermissions: string[];
  userDeniedPermissions: string[];
  effectivePermissions: string[];
};

const PERMISSION_CACHE_TTL_MS = 15000;
const permissionCache = new Map<string, { expiresAt: number; value: EffectivePermissionsResult }>();

function cloneResult(result: EffectivePermissionsResult): EffectivePermissionsResult {
  return {
    rolePermissions: [...result.rolePermissions],
    userAllowedPermissions: [...result.userAllowedPermissions],
    userDeniedPermissions: [...result.userDeniedPermissions],
    effectivePermissions: [...result.effectivePermissions],
  };
}

export function invalidateEffectivePermissions(userId?: string) {
  if (userId) {
    permissionCache.delete(userId);
    return;
  }

  permissionCache.clear();
}

export async function getEffectivePermissions(userId: string): Promise<EffectivePermissionsResult> {
  if (process.env.NODE_ENV !== 'test') {
    const cached = permissionCache.get(userId);
    if (cached && cached.expiresAt > Date.now()) {
      return cloneResult(cached.value);
    }
  }

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
    },
  });

  if (!user) {
    return { rolePermissions: [], userAllowedPermissions: [], userDeniedPermissions: [], effectivePermissions: [] };
  }

  const rolePermissions = user.role.rolePermissions.map(rp => rp.permission.key);

  const userAllowedPermissions: string[] = [];
  const userDeniedPermissions: string[] = [];

  for (const ov of user.permissionOverrides) {
    if (ov.effect === 'ALLOW') {
      userAllowedPermissions.push(ov.permission.key);
    } else if (ov.effect === 'DENY') {
      userDeniedPermissions.push(ov.permission.key);
    }
  }

  const combined = new Set(rolePermissions);
  for (const key of userAllowedPermissions) {
    combined.add(key);
  }
  for (const key of userDeniedPermissions) {
    combined.delete(key);
  }

  const result = {
    rolePermissions,
    userAllowedPermissions,
    userDeniedPermissions,
    effectivePermissions: Array.from(combined),
  };

  if (process.env.NODE_ENV !== 'test') {
    permissionCache.set(userId, { expiresAt: Date.now() + PERMISSION_CACHE_TTL_MS, value: cloneResult(result) });
  }

  return result;
}
