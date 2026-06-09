import type { Request } from 'express';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../utils/appError';
import { createAccessToken, generateRefreshToken, hashToken, verifyPassword } from '../../utils/auth';
import { createAuditLog } from '../audit/audit.service';
import type { RequestUser } from '../../types/auth';

type UserWithRolePermissions = Awaited<ReturnType<typeof getUserById>>;

function mapUserWithPermissions(user: NonNullable<UserWithRolePermissions>) {
  const permissionKeys = user.role.rolePermissions.map((rolePermission) => rolePermission.permission.key);
  const safeUser: RequestUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    mobile: user.mobile,
    status: user.status,
    role: {
      id: user.role.id,
      name: user.role.name,
      key: user.role.key,
      status: user.role.status,
    },
  };

  return {
    user: safeUser,
    permissions: permissionKeys,
  };
}

async function getUserByEmail(email: string) {
  return prisma.user.findUnique({
    where: { email },
    include: {
      role: {
        include: {
          rolePermissions: {
            include: {
              permission: true,
            },
          },
        },
      },
    },
  });
}

async function getUserById(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    include: {
      role: {
        include: {
          rolePermissions: {
            include: {
              permission: true,
            },
          },
        },
      },
    },
  });
}

export async function login(req: Request, email: string, password: string) {
  const user = await getUserByEmail(email);

  if (!user) {
    await createAuditLog(req, {
      action: 'auth.login_failed',
      entityType: 'user',
      metadata: { email },
    });

    throw new AppError('Invalid email or password', 401);
  }

  const passwordMatches = await verifyPassword(password, user.passwordHash);

  if (!passwordMatches || user.status !== 'ACTIVE' || user.role.status !== 'ACTIVE') {
    await createAuditLog(req, {
      userId: user.id,
      action: 'auth.login_failed',
      entityType: 'user',
      entityId: user.id,
      metadata: { email: user.email },
    });

    throw new AppError('Invalid email or password', 401);
  }

  const authUser = mapUserWithPermissions(user);
  const accessToken = createAccessToken(authUser.user);
  const refreshToken = generateRefreshToken();

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    }),
    prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: refreshToken.tokenHash,
        expiresAt: refreshToken.expiresAt,
      },
    }),
  ]);

  await createAuditLog(req, {
    userId: user.id,
    action: 'auth.login_success',
    entityType: 'user',
    entityId: user.id,
  });

  return {
    accessToken,
    refreshToken: refreshToken.token,
    user: authUser.user,
    permissions: authUser.permissions,
  };
}

export async function getCurrentUser(userId: string) {
  const user = await getUserById(userId);

  if (!user) {
    throw new AppError('User not found', 404);
  }

  return mapUserWithPermissions(user);
}

export async function refreshSession(req: Request, refreshToken: string) {
  const tokenHash = hashToken(refreshToken);

  const existingToken = await prisma.refreshToken.findUnique({
    where: { tokenHash },
    include: {
      user: {
        include: {
          role: {
            include: {
              rolePermissions: {
                include: {
                  permission: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!existingToken || existingToken.revokedAt || existingToken.expiresAt <= new Date()) {
    throw new AppError('Refresh token is invalid or expired', 401);
  }

  if (existingToken.user.status !== 'ACTIVE' || existingToken.user.role.status !== 'ACTIVE') {
    throw new AppError('User is not allowed to refresh this session', 401);
  }

  const rotatedToken = generateRefreshToken();
  const authUser = mapUserWithPermissions(existingToken.user);
  const accessToken = createAccessToken(authUser.user);

  await prisma.$transaction([
    prisma.refreshToken.update({
      where: { id: existingToken.id },
      data: { revokedAt: new Date() },
    }),
    prisma.refreshToken.create({
      data: {
        userId: existingToken.userId,
        tokenHash: rotatedToken.tokenHash,
        expiresAt: rotatedToken.expiresAt,
      },
    }),
  ]);

  await createAuditLog(req, {
    userId: existingToken.userId,
    action: 'auth.refresh',
    entityType: 'refresh_token',
    entityId: existingToken.id,
  });

  return {
    accessToken,
    refreshToken: rotatedToken.token,
    user: authUser.user,
    permissions: authUser.permissions,
  };
}

export async function logout(req: Request, refreshToken: string) {
  const tokenHash = hashToken(refreshToken);
  const existingToken = await prisma.refreshToken.findUnique({
    where: { tokenHash },
  });

  if (!existingToken) {
    return;
  }

  await prisma.refreshToken.update({
    where: { id: existingToken.id },
    data: { revokedAt: new Date() },
  });

  await createAuditLog(req, {
    userId: existingToken.userId,
    action: 'auth.logout',
    entityType: 'refresh_token',
    entityId: existingToken.id,
  });
}
