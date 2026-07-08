import { NextFunction, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { AppError } from '../utils/appError';
import { verifyAccessToken } from '../utils/auth';
import { getEffectivePermissions } from '../modules/access/effective-permissions.service';
import { getActorContext } from '../modules/access/actor-context.service';

function extractToken(req: Request): string | null {
  const authorizationHeader = req.headers.authorization;

  if (!authorizationHeader?.startsWith('Bearer ')) {
    return null;
  }

  return authorizationHeader.slice('Bearer '.length);
}

export async function authMiddleware(req: Request, _res: Response, next: NextFunction) {
  const token = extractToken(req);

  if (!token) {
    return next(new AppError('Authentication required', 401));
  }

  let payload;

  try {
    payload = verifyAccessToken(token);
  } catch {
    return next(new AppError('Invalid or expired token', 401));
  }

  // Single query: user + role + rolePermissions + permission + permissionOverrides + dataScopes + profileLinks
  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
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
      permissionOverrides: {
        where: {
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        },
        include: { permission: true },
      },
      dataScopes: {
        where: {
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        },
      },
      profileLinks: {
        where: { status: 'ACTIVE' },
        orderBy: [{ isPrimary: 'desc' }],
      },
    },
  });

  if (!user || user.status !== 'ACTIVE' || user.role.status !== 'ACTIVE') {
    return next(new AppError('User is not authorized', 401));
  }

  const effectivePermissions = await getEffectivePermissions(user.id, user);

  req.authUser = {
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
  req.authPermissions = effectivePermissions.effectivePermissions;
  req.authEffectivePermissions = effectivePermissions;
  req.authPreloadedUser = user;

  try {
    const actorContext = await getActorContext(user.id, user);
    req.authActorContext = actorContext;
    req.authDataScopes = actorContext.dataScopes;
  } catch {
    // Non-critical: middleware continues without actor context
  }

  return next();
}
