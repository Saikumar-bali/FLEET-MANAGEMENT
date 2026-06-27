import { NextFunction, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { AppError } from '../utils/appError';
import { verifyAccessToken } from '../utils/auth';
import { getEffectivePermissions } from '../modules/permissions/effective-permissions.service';

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
    },
  });

  if (!user || user.status !== 'ACTIVE' || user.role.status !== 'ACTIVE') {
    return next(new AppError('User is not authorized', 401));
  }

  req.authUser = {
    id: user.id,
    name: user.name,
    username: user.username,
    email: user.email,
    mobile: user.mobile,
    status: user.status,
    userDriverId: user.userDriverId,
    role: {
      id: user.role.id,
      name: user.role.name,
      key: user.role.key,
      status: user.role.status,
    },
  };

  // Use effective permissions (role + user overrides)
  const effective = await getEffectivePermissions(user.id);
  req.authPermissions = effective.effectivePermissions;

  return next();
}
