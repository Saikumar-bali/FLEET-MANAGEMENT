import type { ActorContext, DataScopeEntry } from './actor-context.service';

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
  if (actor.isGlobalUser) {
    return true;
  }

  return actor.dataScopes.some((ds: DataScopeEntry) => {
    if (ds.scopeType !== scopeType) return false;
    if (ds.scopeId !== null && ds.scopeId !== scopeId) return false;
    if (accessLevel && ds.accessLevel !== accessLevel) return false;
    return true;
  });
}

export function getScopedWhere(
  actor: ActorContext,
  scopeType: string,
  idField = 'id',
): Record<string, unknown> | undefined {
  if (actor.isGlobalUser) {
    return undefined;
  }

  const scopes = actor.dataScopes.filter(ds => ds.scopeType === scopeType && ds.scopeId !== null);
  if (scopes.length === 0) {
    return { [idField]: '__NO_ACCESS__' };
  }

  return { [idField]: { in: scopes.map(ds => ds.scopeId) } };
}

export function assertCanAccessRecord(
  actor: ActorContext,
  scopeType: string,
  recordUserId: string | null | undefined,
  recordScopeId?: string,
): void {
  if (actor.isGlobalUser) return;
  if (recordUserId && recordUserId === actor.user.id) return;
  if (recordScopeId && hasScope(actor, scopeType, recordScopeId)) return;

  throw new Error('Access denied: insufficient data scope');
}

export function assertOwnOrScoped(
  actor: ActorContext,
  ownerUserId?: string,
  scopeType?: string,
  scopeId?: string,
): void {
  if (actor.isGlobalUser) return;
  if (ownerUserId && ownerUserId === actor.user.id) return;
  if (scopeType && scopeId && hasScope(actor, scopeType, scopeId)) return;

  throw new Error('Access denied: you can only access your own records or records within your data scopes');
}
