import type { ActorContext } from './actor-context.service';
import { can, hasScope, isGlobalUser } from './access-policy.service';
import { getResourceMapping, type ResourceType } from './resource-scope-map';
import { AppError } from '../../utils/appError';

type RecordWithRelations = Record<string, unknown>;

function deny(message: string): never {
  throw new AppError(message, 403);
}

function checkPermission(actor: ActorContext, permissionKey: string): void {
  if (!can(actor, permissionKey)) {
    deny(`Access denied: missing permission ${permissionKey}`);
  }
}

function checkScopeForRecord(
  actor: ActorContext,
  resourceType: ResourceType,
  record: RecordWithRelations,
): void {
  if (isGlobalUser(actor)) return;

  const mapping = getResourceMapping(resourceType);
  const scopeType = mapping.scopeType;

  const vehicleId = record.vehicleId as string | null | undefined;
  const driverId = record.driverId as string | null | undefined;
  const tripId = record.tripId as string | null | undefined;
  const createdById = record[mapping.ownerField || 'createdById'] as string | null | undefined;

  if (createdById === actor.user.id) return;

  if (vehicleId && hasScope(actor, 'VEHICLE', vehicleId)) return;
  if (driverId && hasScope(actor, 'DRIVER', driverId)) return;
  if (tripId && hasScope(actor, 'TRIP', tripId)) return;
  if (scopeType !== 'VEHICLE' && hasScope(actor, scopeType, record.id as string)) return;

  deny('Access denied: record not in your data scope');
}

export function assertCanReadResource(
  actor: ActorContext,
  resourceType: ResourceType,
  record: RecordWithRelations,
): void {
  const mapping = getResourceMapping(resourceType);
  checkPermission(actor, mapping.permissions.view);
  checkScopeForRecord(actor, resourceType, record);
}

export function assertCanCreateResource(
  actor: ActorContext,
  resourceType: ResourceType,
  input: RecordWithRelations,
): void {
  const mapping = getResourceMapping(resourceType);
  checkPermission(actor, mapping.permissions.create);

  if (isGlobalUser(actor)) return;

  const vehicleId = input.vehicleId as string | undefined;
  const driverId = input.driverId as string | undefined;
  const tripId = input.tripId as string | undefined;

  const hasAnyScope = vehicleId && hasScope(actor, 'VEHICLE', vehicleId) ||
    driverId && hasScope(actor, 'DRIVER', driverId) ||
    tripId && hasScope(actor, 'TRIP', tripId);

  if (vehicleId || driverId || tripId) {
    if (!hasAnyScope) {
      deny('Access denied: cannot create record for resource outside your data scope');
    }
  }
}

export function assertCanUpdateResource(
  actor: ActorContext,
  resourceType: ResourceType,
  record: RecordWithRelations,
): void {
  const mapping = getResourceMapping(resourceType);
  checkPermission(actor, mapping.permissions.update);
  checkScopeForRecord(actor, resourceType, record);
}

export function assertCanDeleteResource(
  actor: ActorContext,
  resourceType: ResourceType,
  record: RecordWithRelations,
): void {
  const mapping = getResourceMapping(resourceType);
  checkPermission(actor, mapping.permissions.delete);
  checkScopeForRecord(actor, resourceType, record);
}

export function getScopedWhereForResource(
  actor: ActorContext,
  resourceType: ResourceType,
): Record<string, unknown> | undefined {
  if (isGlobalUser(actor)) return undefined;

  const mapping = getResourceMapping(resourceType);
  const scopeType = mapping.scopeType;
  const conditions: Record<string, unknown>[] = [];

  const ownerField = mapping.ownerField;
  if (ownerField) {
    conditions.push({ [ownerField]: actor.user.id });
  }

  if (mapping.relationFields.vehicleId) {
    const vField = mapping.relationFields.vehicleId;
    const vehicleScopeIds = actor.dataScopes
      .filter(ds => ds.scopeType === 'VEHICLE' && ds.scopeId !== null)
      .map(ds => ds.scopeId!);
    if (vehicleScopeIds.length > 0) {
      conditions.push({ [vField]: { in: vehicleScopeIds } });
    }
  }

  if (mapping.relationFields.driverId) {
    const dField = mapping.relationFields.driverId;
    const driverScopeIds = actor.dataScopes
      .filter(ds => ds.scopeType === 'DRIVER' && ds.scopeId !== null)
      .map(ds => ds.scopeId!);
    if (driverScopeIds.length > 0) {
      conditions.push({ [dField]: { in: driverScopeIds } });
    }
  }

  if (mapping.relationFields.tripId && scopeType === 'TRIP') {
    const tripField = mapping.relationFields.tripId;
    const tripScopeIds = actor.dataScopes
      .filter(ds => ds.scopeType === 'TRIP' && ds.scopeId !== null)
      .map(ds => ds.scopeId!);
    if (tripScopeIds.length > 0) {
      conditions.push({ [tripField]: { in: tripScopeIds } });
    }
  }

  if (conditions.length === 0) {
    return { id: '__NO_ACCESS__' };
  }

  if (conditions.length === 1) return conditions[0];
  return { OR: conditions };
}
