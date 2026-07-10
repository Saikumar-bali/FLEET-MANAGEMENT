import type { Request } from 'express';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../utils/appError';
import { createAccessToken, generateRefreshToken, hashToken, verifyPassword } from '../../utils/auth';
import { createAuditLog } from '../audit/audit.service';
import type { RequestUser, EffectivePermissions, DataScopeEntry } from '../../types/auth';
import { getEffectivePermissions } from '../access/effective-permissions.service';

type UserWithRolePermissions = Awaited<ReturnType<typeof getUserById>>;

function mapUserWithPermissions(user: NonNullable<UserWithRolePermissions>, effective?: EffectivePermissions, dataScopes?: DataScopeEntry[]) {
  const permissionKeys = user.role.rolePermissions.map(
    (rolePermission: { permission: { key: string } }) => rolePermission.permission.key,
  );
  const safeUser: RequestUser = {
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
  };

  return {
    user: safeUser,
    permissions: effective?.effectivePermissions ?? permissionKeys,
    rolePermissions: effective?.rolePermissions ?? permissionKeys,
    effectivePermissions: effective?.effectivePermissions ?? permissionKeys,
    userAllowedPermissions: effective?.userAllowedPermissions ?? [],
    userDeniedPermissions: effective?.userDeniedPermissions ?? [],
    dataScopes: dataScopes ?? [],
  };
}

async function getUserByIdentifier(identifier: string) {
  return prisma.user.findFirst({
    where: {
      OR: [
        { email: identifier },
        { username: identifier },
      ],
    },
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

export async function login(req: Request, identifier: string, password: string) {
  const user = await getUserByIdentifier(identifier);

  if (!user) {
    await createAuditLog(req, {
      action: 'auth.login_failed',
      entityType: 'user',
      metadata: { identifier },
    });

    throw new AppError('Invalid username/email or password', 401);
  }

  const passwordMatches = await verifyPassword(password, user.passwordHash);

  if (!passwordMatches || user.status !== 'ACTIVE' || user.role.status !== 'ACTIVE') {
    await createAuditLog(req, {
      userId: user.id,
      action: 'auth.login_failed',
      entityType: 'user',
      entityId: user.id,
      metadata: { identifier, email: user.email, username: user.username },
    });

    throw new AppError('Invalid username/email or password', 401);
  }

  const effectivePermissions = await getEffectivePermissions(user.id);
  const userData = await prisma.user.findUnique({
    where: { id: user.id },
    include: {
      dataScopes: {
        where: { OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
      },
    },
  });
  const dataScopes: DataScopeEntry[] = userData?.dataScopes.map(ds => ({
    id: ds.id,
    scopeType: ds.scopeType,
    scopeId: ds.scopeId,
    accessLevel: ds.accessLevel,
    expiresAt: ds.expiresAt,
  })) ?? [];

  const authUser = mapUserWithPermissions(user, effectivePermissions, dataScopes);
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
    effectivePermissions: authUser.effectivePermissions,
    rolePermissions: authUser.rolePermissions,
    userAllowedPermissions: authUser.userAllowedPermissions,
    userDeniedPermissions: authUser.userDeniedPermissions,
    dataScopes: authUser.dataScopes,
  };
}

export async function getCurrentUser(userId: string, preloadedUser?: any, preloadedPermissions?: string[], preloadedActorContext?: any) {
  // If preloaded data is available from auth middleware, use it directly (zero DB queries)
  if (preloadedUser && preloadedPermissions && preloadedActorContext) {
    const permissionKeys = preloadedUser.role.rolePermissions?.map(
      (rp: any) => rp.permission.key,
    ) ?? [];

    const safeUser: RequestUser = {
      id: preloadedUser.id,
      name: preloadedUser.name,
      username: preloadedUser.username,
      email: preloadedUser.email,
      mobile: preloadedUser.mobile,
      status: preloadedUser.status,
      role: {
        id: preloadedUser.role.id,
        name: preloadedUser.role.name,
        key: preloadedUser.role.key,
        status: preloadedUser.role.status,
      },
    };

    return {
      ...safeUser,
      effectivePermissions: preloadedPermissions,
      rolePermissions: permissionKeys,
      userAllowedPermissions: preloadedActorContext?.effectivePermissions ?? [],
      userDeniedPermissions: [],
      dataScopes: (preloadedActorContext?.dataScopes ?? []).map((ds: any) => ({
        id: ds.id,
        scopeType: ds.scopeType,
        scopeId: ds.scopeId,
        accessLevel: ds.accessLevel,
        expiresAt: ds.expiresAt,
      })),
    };
  }

  // Fallback: full DB query path (for non-middleware contexts)
  const user = await getUserById(userId);

  if (!user) {
    throw new AppError('User not found', 404);
  }

  const effectivePermissions = await getEffectivePermissions(userId);
  const userData = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      dataScopes: {
        where: { OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
      },
    },
  });
  const dataScopes: DataScopeEntry[] = userData?.dataScopes.map(ds => ({
    id: ds.id,
    scopeType: ds.scopeType,
    scopeId: ds.scopeId,
    accessLevel: ds.accessLevel,
    expiresAt: ds.expiresAt,
  })) ?? [];

  const result = mapUserWithPermissions(user, effectivePermissions, dataScopes);
  return {
    ...result,
    effectivePermissions: result.effectivePermissions,
    rolePermissions: result.rolePermissions,
    userAllowedPermissions: result.userAllowedPermissions,
    userDeniedPermissions: result.userDeniedPermissions,
    dataScopes: result.dataScopes,
  };
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

  const effectivePermissions = await getEffectivePermissions(existingToken.userId);
  const userData = await prisma.user.findUnique({
    where: { id: existingToken.userId },
    include: {
      dataScopes: {
        where: { OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
      },
    },
  });
  const dataScopes: DataScopeEntry[] = userData?.dataScopes.map(ds => ({
    id: ds.id,
    scopeType: ds.scopeType,
    scopeId: ds.scopeId,
    accessLevel: ds.accessLevel,
    expiresAt: ds.expiresAt,
  })) ?? [];

  const rotatedToken = generateRefreshToken();
  const authUser = mapUserWithPermissions(existingToken.user, effectivePermissions, dataScopes);
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
    effectivePermissions: authUser.effectivePermissions,
    rolePermissions: authUser.rolePermissions,
    userAllowedPermissions: authUser.userAllowedPermissions,
    userDeniedPermissions: authUser.userDeniedPermissions,
    dataScopes: authUser.dataScopes,
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
