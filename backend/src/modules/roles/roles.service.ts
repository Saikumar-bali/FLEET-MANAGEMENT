import { prisma } from '../../lib/prisma';
import { AppError } from '../../utils/appError';
import { criticalRoleManagementPermissionKeys, criticalSuperAdminPermissionKeys } from '../../constants/rbac';

const roleWithPermissionsInclude = {
  rolePermissions: {
    include: {
      permission: true,
    },
  },
} as const;

export async function listRoles() {
  return prisma.role.findMany({
    orderBy: { createdAt: 'asc' },
    include: roleWithPermissionsInclude,
  });
}

export async function createRole(input: {
  name: string;
  key: string;
  description?: string;
  status: 'ACTIVE' | 'INACTIVE';
}) {
  return prisma.role.create({
    data: {
      name: input.name,
      key: input.key,
      description: input.description || null,
      status: input.status,
      isSystem: false,
    },
    include: roleWithPermissionsInclude,
  });
}

export async function updateRole(
  roleId: string,
  input: {
    name?: string;
    key?: string;
    description?: string;
    status?: 'ACTIVE' | 'INACTIVE';
  },
) {
  const existingRole = await prisma.role.findUnique({
    where: { id: roleId },
  });

  if (!existingRole) {
    throw new AppError('Role not found', 404);
  }

  if (existingRole.isSystem && input.key && input.key !== existingRole.key) {
    throw new AppError('System roles cannot change their key', 400);
  }

  if (existingRole.key === 'super_admin' && input.status === 'INACTIVE') {
    throw new AppError('The super_admin role cannot be deactivated', 400);
  }

  return prisma.role.update({
    where: { id: roleId },
    data: {
      name: input.name,
      key: input.key,
      description: input.description === '' ? null : input.description,
      status: input.status,
    },
    include: roleWithPermissionsInclude,
  });
}

function ensurePermissionSet(permissionKeys: string[], requiredPermissionKeys: string[], errorMessage: string) {
  const permissionKeySet = new Set(permissionKeys);

  for (const requiredPermissionKey of requiredPermissionKeys) {
    if (!permissionKeySet.has(requiredPermissionKey)) {
      throw new AppError(errorMessage, 400);
    }
  }
}

export async function assignRolePermissions(
  roleId: string,
  permissionKeys: string[],
  currentUser?: { id: string; roleId: string },
) {
  const role = await prisma.role.findUnique({
    where: { id: roleId },
    include: {
      users: {
        select: {
          id: true,
        },
      },
    },
  });

  if (!role) {
    throw new AppError('Role not found', 404);
  }

  const permissions = await prisma.permission.findMany({
    where: {
      key: { in: permissionKeys },
    },
  });

  if (permissions.length !== permissionKeys.length) {
    const foundKeys = new Set(permissions.map((permission: { key: string }) => permission.key));
    const missingKeys = permissionKeys.filter((permissionKey) => !foundKeys.has(permissionKey));
    throw new AppError(`Unknown permission keys: ${missingKeys.join(', ')}`, 400);
  }

  if (role.key === 'super_admin') {
    ensurePermissionSet(
      permissionKeys,
      criticalSuperAdminPermissionKeys,
      'Critical permissions cannot be removed from super_admin',
    );
  }

  if (currentUser && role.users.some((user: { id: string }) => user.id === currentUser.id)) {
    try {
      ensurePermissionSet(
        permissionKeys,
        criticalRoleManagementPermissionKeys,
        'You cannot remove your own ability to manage roles and permissions',
      );
    } catch (error) {
      if (error instanceof AppError && error.message === 'You cannot remove your own ability to manage roles and permissions') {
        throw new AppError(error.message, 403);
      }

      throw error;
    }
  }

  await prisma.$transaction([
    prisma.rolePermission.deleteMany({
      where: { roleId },
    }),
    prisma.rolePermission.createMany({
      data: permissions.map((permission: { id: string }) => ({
        roleId,
        permissionId: permission.id,
      })),
    }),
  ]);

  return prisma.role.findUnique({
    where: { id: roleId },
    include: roleWithPermissionsInclude,
  });
}
