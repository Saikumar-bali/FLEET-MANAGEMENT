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

// Short-lived in-memory cache to avoid re-querying the same user on every request
const AUTH_CACHE_TTL_MS = 10_000; // 10 seconds
const authCache = new Map<string, {
  expiresAt: number;
  user: NonNullable<Awaited<ReturnType<typeof loadUser>>>;
  perms: string[];
  actor: any;
}>();

function cloneUser<T>(obj: T): T {
  if (obj === null || obj === undefined || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(cloneUser) as T;
  const copy: any = Array.isArray(obj) ? [] : {};
  for (const key of Object.keys(obj as any)) {
    copy[key] = cloneUser((obj as any)[key]);
  }
  return copy;
}

async function loadUser(userId: string) {
  return prisma.user.findUnique({
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

  // Check cache first
  let cached = authCache.get(payload.sub);
  if (cached && cached.expiresAt > Date.now()) {
    const user = cloneUser(cached.user);
    req.authUser = {
      id: user.id,
      name: user.name,
      username: user.username,
      email: user.email,
      mobile: user.mobile,
      status: user.status,
      role: { id: user.role.id, name: user.role.name, key: user.role.key, status: user.role.status },
    };
    req.authPreloadedUser = user;
    req.authPermissions = cached.perms;
    req.authActorContext = cached.actor;
    req.authDataScopes = cached.actor?.dataScopes ?? [];
    return next();
  }

  // Single query: user + role + rolePermissions + permission + permissionOverrides + dataScopes + profileLinks
  const user = await loadUser(payload.sub);

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

  let actorContext;
  try {
    actorContext = await getActorContext(user.id, user);
    req.authActorContext = actorContext;
    req.authDataScopes = actorContext.dataScopes;
  } catch {
    // Non-critical: middleware continues without actor context
  }

  // Cache the result for subsequent requests
  authCache.set(payload.sub, {
    expiresAt: Date.now() + AUTH_CACHE_TTL_MS,
    user,
    perms: effectivePermissions.effectivePermissions,
    actor: actorContext,
  });

  return next();
}
