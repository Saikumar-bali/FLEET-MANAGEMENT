import { prisma } from '../../lib/prisma';
import { AppError } from '../../utils/appError';

export async function listRoles() {
  return prisma.role.findMany({
    orderBy: { createdAt: 'asc' },
    include: {
      rolePermissions: {
        include: {
          permission: true,
        },
      },
    },
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
  });
}

export async function updateRole(roleId: string, input: {
  name?: string;
  key?: string;
  description?: string;
  status?: 'ACTIVE' | 'INACTIVE';
}) {
  const existingRole = await prisma.role.findUnique({
    where: { id: roleId },
  });

  if (!existingRole) {
    throw new AppError('Role not found', 404);
  }

  if (existingRole.isSystem && input.key && input.key !== existingRole.key) {
    throw new AppError('System roles cannot change their key', 400);
  }

  return prisma.role.update({
    where: { id: roleId },
    data: {
      name: input.name,
      key: input.key,
      description: input.description === '' ? null : input.description,
      status: input.status,
    },
  });
}

export async function assignRolePermissions(roleId: string, permissionKeys: string[]) {
  const role = await prisma.role.findUnique({
    where: { id: roleId },
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
    const foundKeys = new Set(permissions.map((permission) => permission.key));
    const missingKeys = permissionKeys.filter((permissionKey) => !foundKeys.has(permissionKey));
    throw new AppError(`Unknown permission keys: ${missingKeys.join(', ')}`, 400);
  }

  await prisma.$transaction([
    prisma.rolePermission.deleteMany({
      where: { roleId },
    }),
    prisma.rolePermission.createMany({
      data: permissions.map((permission) => ({
        roleId,
        permissionId: permission.id,
      })),
    }),
  ]);

  return prisma.role.findUnique({
    where: { id: roleId },
    include: {
      rolePermissions: {
        include: {
          permission: true,
        },
      },
    },
  });
}
