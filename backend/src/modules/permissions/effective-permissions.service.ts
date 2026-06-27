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
            include: {
              permission: { select: { key: true } },
            },
          },
        },
      },
      permissionOverrides: {
        where: {
          OR: [
            { expiresAt: null },
            { expiresAt: { gte: new Date() } },
          ],
        },
        include: {
          permission: { select: { key: true } },
        },
      },
    },
  });

  if (!user) {
    return {
      rolePermissions: [],
      userAllowedPermissions: [],
      userDeniedPermissions: [],
      effectivePermissions: [],
    };
  }

  // Start with role-based permissions
  const rolePermissions = user.role.rolePermissions.map(
    (rp: { permission: { key: string } }) => rp.permission.key,
  );

  // Apply user overrides
  const allowed: string[] = [];
  const denied: string[] = [];

  for (const override of user.permissionOverrides) {
    if (override.effect === 'ALLOW') {
      allowed.push(override.permission.key);
    } else if (override.effect === 'DENY') {
      denied.push(override.permission.key);
    }
  }

  // Build effective permissions: role permissions + ALLOW overrides - DENY overrides
  const permissionSet = new Set(rolePermissions);
  for (const key of allowed) {
    permissionSet.add(key);
  }
  for (const key of denied) {
    permissionSet.delete(key);
  }

  return {
    rolePermissions,
    userAllowedPermissions: allowed,
    userDeniedPermissions: denied,
    effectivePermissions: Array.from(permissionSet),
  };
}
