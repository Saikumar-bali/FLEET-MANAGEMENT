import type { ActorContext, DataScopeEntry } from './actor-context.service';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../utils/appError';

const ACCESS_LEVEL_HIERARCHY: Record<string, string[]> = {
  VIEW: ['VIEW'],
  CREATE: ['VIEW', 'CREATE'],
  UPDATE: ['VIEW', 'UPDATE'],
  DELETE: ['VIEW', 'DELETE'],
  MANAGE: ['VIEW', 'CREATE', 'UPDATE', 'DELETE', 'MANAGE'],
};

function levelIncludes(required: string, granted: string): boolean {
  return ACCESS_LEVEL_HIERARCHY[granted]?.includes(required) ?? false;
}

export function isGlobalUser(actor: ActorContext): boolean {
  return actor.isGlobalUser;
}

export function can(actor: ActorContext, permissionKey: string): boolean {
  return actor.effectivePermissions.includes(permissionKey);
}

export function canAny(actor: ActorContext, permissionKeys: string[]): boolean {
  return permissionKeys.some(key => actor.effectivePermissions.includes(key));
}

export function hasScope(
  actor: ActorContext,
  scopeType: string,
  scopeId: string,
  accessLevel?: string,
): boolean {
  if (actor.isSuperAdmin) return true;

  const globalManage = actor.dataScopes.some(
    ds => ds.scopeType === 'GLOBAL' && ds.accessLevel === 'MANAGE',
  );
  if (globalManage) return true;

  return actor.dataScopes.some((ds: DataScopeEntry) => {
    if (ds.scopeType !== scopeType) return false;

    const scopeIdMatch = ds.scopeId === null || ds.scopeId === scopeId;
    if (!scopeIdMatch) return false;

    if (accessLevel) {
      return levelIncludes(accessLevel, ds.accessLevel);
    }

    return true;
  });
}

export function getScopedWhere(
  actor: ActorContext,
  scopeType: string,
  idField = 'id',
): Record<string, unknown> | undefined {
  if (actor.isSuperAdmin) return undefined;

  const globalManage = actor.dataScopes.some(
    ds => ds.scopeType === 'GLOBAL' && ds.accessLevel === 'MANAGE',
  );
  if (globalManage) return undefined;

  const scopedIds = actor.dataScopes
    .filter(ds => ds.scopeType === scopeType && ds.scopeId !== null)
    .map(ds => ds.scopeId!);

  if (scopedIds.length === 0) {
    return { [idField]: '__NO_ACCESS__' };
  }

  return { [idField]: { in: scopedIds } };
}

export function assertCanAccessRecord(
  actor: ActorContext,
  scopeType: string,
  recordUserId: string | null | undefined,
  recordScopeId?: string,
): void {
  if (actor.isSuperAdmin) return;

  const globalManage = actor.dataScopes.some(
    ds => ds.scopeType === 'GLOBAL' && ds.accessLevel === 'MANAGE',
  );
  if (globalManage) return;

  if (recordUserId && recordUserId === actor.user.id) return;
  if (recordScopeId && hasScope(actor, scopeType, recordScopeId)) return;

  throw new AppError('Access denied: insufficient data scope', 403);
}

export function assertOwnOrScoped(
  actor: ActorContext,
  ownerUserId?: string,
  scopeType?: string,
  scopeId?: string,
): void {
  if (actor.isSuperAdmin) return;

  const globalManage = actor.dataScopes.some(
    ds => ds.scopeType === 'GLOBAL' && ds.accessLevel === 'MANAGE',
  );
  if (globalManage) return;

  if (ownerUserId && ownerUserId === actor.user.id) return;
  if (scopeType && scopeId && hasScope(actor, scopeType, scopeId)) return;

  throw new AppError('Access denied: you can only access your own records or records within your data scopes', 403);
}

const CRITICAL_MODULE_PREFIXES = ['role', 'permission', 'system'];

const MODULES_BLOCKED_FOR_NON_SUPER_ADMIN = [
  'role',
  'permission',
  'system',
];

export async function assertCanGrantPermission(
  actor: ActorContext,
  targetUserId: string,
  permissionKey: string,
): Promise<void> {
  if (actor.user.id === targetUserId && !actor.isSuperAdmin) {
    throw new AppError('Cannot modify own permission overrides unless super_admin', 403);
  }

  if (actor.isSuperAdmin) return;

  const blocked = MODULES_BLOCKED_FOR_NON_SUPER_ADMIN.some(m => permissionKey.startsWith(m + '.'));
  if (blocked) {
    throw new AppError('Only super_admin can grant critical permissions (role, permission, system)', 403);
  }

  const permission = await prisma.permission.findFirst({ where: { key: permissionKey } });
  if (!permission) {
    throw new AppError(`Permission not found: ${permissionKey}`, 404);
  }
}

export async function assertCanGrantScope(
  actor: ActorContext,
  targetUserId: string,
  scopeType: string,
  accessLevel: string,
): Promise<void> {
  if (actor.user.id === targetUserId && !actor.isSuperAdmin) {
    throw new AppError('Cannot grant scope to self unless super_admin', 403);
  }

  if (actor.isSuperAdmin) return;

  if (scopeType === 'GLOBAL') {
    throw new AppError('Only super_admin can grant GLOBAL scope', 403);
  }

  if (accessLevel === 'MANAGE') {
    if (!actor.isAdmin) {
      throw new AppError('Only super_admin or admin can grant MANAGE scope', 403);
    }
  }
}
