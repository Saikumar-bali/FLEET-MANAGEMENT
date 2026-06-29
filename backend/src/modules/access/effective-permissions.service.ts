import { prisma } from '../../lib/prisma';

export type EffectivePermissionsResult = {
  rolePermissions: string[];
  userAllowedPermissions: string[];
  userDeniedPermissions: string[];
  effectivePermissions: string[];
};

export async function getEffectivePermissions(userId: string): Promise<EffectivePermissionsResult> {
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

  const deniedSet = new Set(userDeniedPermissions);
  const allowedSet = new Set(userAllowedPermissions);

  const combined = new Set(rolePermissions);
  for (const key of userAllowedPermissions) {
    combined.add(key);
  }
  for (const key of userDeniedPermissions) {
    combined.delete(key);
  }

  const effectivePermissions = Array.from(combined);

  return { rolePermissions, userAllowedPermissions, userDeniedPermissions, effectivePermissions };
}
