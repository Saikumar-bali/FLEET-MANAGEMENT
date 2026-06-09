import type { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../utils/appError';
import { hashPassword } from '../../utils/auth';
import { criticalRoleManagementPermissionKeys } from '../../constants/rbac';

const userWithRoleSelect = {
  role: {
    select: {
      id: true,
      name: true,
      key: true,
      status: true,
      rolePermissions: {
        include: {
          permission: true,
        },
      },
    },
  },
} satisfies Prisma.UserInclude;

type UserWithRole = Prisma.UserGetPayload<{ include: typeof userWithRoleSelect }>;

function sanitizeUser(user: UserWithRole) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    mobile: user.mobile,
    status: user.status,
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    role: {
      id: user.role.id,
      name: user.role.name,
      key: user.role.key,
      status: user.role.status,
    },
  };
}

async function getRoleWithPermissions(roleId: string) {
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

async function ensureEmailAvailable(email: string, excludedUserId?: string) {
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser && existingUser.id !== excludedUserId) {
    throw new AppError('Email address is already in use', 400);
  }
}

async function countActiveSuperAdmins() {
  return prisma.user.count({
    where: {
      status: 'ACTIVE',
      role: {
        key: 'super_admin',
      },
    },
  });
}

function roleHasCriticalManagementPermissions(role: NonNullable<Awaited<ReturnType<typeof getRoleWithPermissions>>>) {
  const permissionKeys = new Set(role.rolePermissions.map((entry) => entry.permission.key));
  return criticalRoleManagementPermissionKeys.every((permissionKey) => permissionKeys.has(permissionKey));
}

async function assertCurrentUserKeepsManagementAccess(params: {
  currentUserId: string;
  targetUser: UserWithRole;
  nextRoleId?: string;
  nextStatus?: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
}) {
  const { currentUserId, targetUser, nextRoleId, nextStatus } = params;

  if (targetUser.id !== currentUserId) {
    return;
  }

  const effectiveStatus = nextStatus ?? targetUser.status;

  if (effectiveStatus !== 'ACTIVE') {
    throw new AppError('You cannot remove your own ability to manage roles and permissions', 403);
  }

  if (!nextRoleId || nextRoleId === targetUser.role.id) {
    return;
  }

  const nextRole = await getRoleWithPermissions(nextRoleId);

  if (!nextRole) {
    throw new AppError('Selected role not found', 404);
  }

  if (!roleHasCriticalManagementPermissions(nextRole)) {
    throw new AppError('You cannot remove your own ability to manage roles and permissions', 403);
  }
}

async function assertSuperAdminSafety(params: {
  targetUser: UserWithRole;
  nextRoleId?: string;
  nextStatus?: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
}) {
  const { targetUser, nextRoleId, nextStatus } = params;
  const isCurrentlyActiveSuperAdmin = targetUser.role.key === 'super_admin' && targetUser.status === 'ACTIVE';

  if (!isCurrentlyActiveSuperAdmin) {
    return;
  }

  const changingAwayFromSuperAdmin = !!nextRoleId && nextRoleId !== targetUser.role.id;
  const deactivatingSuperAdmin = !!nextStatus && nextStatus !== 'ACTIVE';

  if (!changingAwayFromSuperAdmin && !deactivatingSuperAdmin) {
    return;
  }

  const activeSuperAdminCount = await countActiveSuperAdmins();

  if (activeSuperAdminCount <= 1) {
    throw new AppError('You cannot remove or deactivate the last active super admin user', 400);
  }
}

export async function listUsers() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'asc' },
    include: userWithRoleSelect,
  });

  return users.map(sanitizeUser);
}

export async function getUserById(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: userWithRoleSelect,
  });

  if (!user) {
    throw new AppError('User not found', 404);
  }

  return sanitizeUser(user);
}

export async function createUser(input: {
  name: string;
  email: string;
  mobile?: string;
  password: string;
  roleId: string;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
}) {
  await ensureEmailAvailable(input.email);

  const role = await prisma.role.findUnique({
    where: { id: input.roleId },
  });

  if (!role) {
    throw new AppError('Selected role not found', 404);
  }

  const passwordHash = await hashPassword(input.password);

  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      mobile: input.mobile || null,
      passwordHash,
      roleId: input.roleId,
      status: input.status,
    },
    include: userWithRoleSelect,
  });

  return sanitizeUser(user);
}

export async function updateUser(params: {
  userId: string;
  currentUserId: string;
  input: {
    name?: string;
    mobile?: string;
    roleId?: string;
    status?: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  };
}) {
  const { userId, currentUserId, input } = params;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: userWithRoleSelect,
  });

  if (!user) {
    throw new AppError('User not found', 404);
  }

  if (input.roleId) {
    const role = await prisma.role.findUnique({
      where: { id: input.roleId },
    });

    if (!role) {
      throw new AppError('Selected role not found', 404);
    }
  }

  await assertSuperAdminSafety({
    targetUser: user,
    nextRoleId: input.roleId,
    nextStatus: input.status,
  });

  await assertCurrentUserKeepsManagementAccess({
    currentUserId,
    targetUser: user,
    nextRoleId: input.roleId,
    nextStatus: input.status,
  });

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      name: input.name,
      mobile: input.mobile === '' ? null : input.mobile,
      roleId: input.roleId,
      status: input.status,
    },
    include: userWithRoleSelect,
  });

  return sanitizeUser(updatedUser);
}

export async function updateUserStatus(params: {
  userId: string;
  currentUserId: string;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
}) {
  return updateUser({
    userId: params.userId,
    currentUserId: params.currentUserId,
    input: { status: params.status },
  });
}

export async function updateUserPassword(userId: string, password: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new AppError('User not found', 404);
  }

  const passwordHash = await hashPassword(password);

  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash },
  });

  return { id: userId };
}
