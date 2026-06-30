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

function scopeIncludesLevel(actor: ActorContext, scopeType: string, scopeId: string, requiredLevel: string): boolean {
  return hasScope(actor, scopeType, scopeId, requiredLevel);
}

function checkScopeForRecord(
  actor: ActorContext,
  resourceType: ResourceType,
  record: RecordWithRelations,
  requiredLevel: string = 'VIEW',
): void {
  if (isGlobalUser(actor)) return;

  const mapping = getResourceMapping(resourceType);

  const createdById = record[mapping.ownerField || 'createdById'] as string | null | undefined;
  if (createdById === actor.user.id) return;

  if (resourceType === 'VEHICLE') {
    const recordId = record.id as string;
    if (recordId && scopeIncludesLevel(actor, 'VEHICLE', recordId, requiredLevel)) return;
    deny(`Access denied: insufficient data scope (need ${requiredLevel} on VEHICLE ${recordId})`);
  }

  if (resourceType === 'DRIVER') {
    const recordId = record.id as string;
    if (recordId && scopeIncludesLevel(actor, 'DRIVER', recordId, requiredLevel)) return;
    deny(`Access denied: insufficient data scope (need ${requiredLevel} on DRIVER ${recordId})`);
  }

  const vehicleId = record.vehicleId as string | null | undefined;
  const driverId = record.driverId as string | null | undefined;
  const tripId = record.tripId as string | null | undefined;

  if (vehicleId && scopeIncludesLevel(actor, 'VEHICLE', vehicleId, requiredLevel)) return;
  if (driverId && scopeIncludesLevel(actor, 'DRIVER', driverId, requiredLevel)) return;
  if (tripId && scopeIncludesLevel(actor, 'TRIP', tripId, requiredLevel)) return;

  if (resourceType === 'TRIP') {
    const recordId = record.id as string;
    if (recordId && scopeIncludesLevel(actor, 'TRIP', recordId, requiredLevel)) return;
  }

  deny(`Access denied: insufficient data scope (need ${requiredLevel} scope for this record)`);
}

function checkScopeForInput(
  actor: ActorContext,
  input: RecordWithRelations,
  requiredLevel: string = 'CREATE',
): void {
  if (isGlobalUser(actor)) return;

  const vehicleId = input.vehicleId as string | undefined;
  const driverId = input.driverId as string | undefined;
  const tripId = input.tripId as string | undefined;

  const checks: Array<{ scopeType: string; scopeId: string }> = [];
  if (vehicleId) checks.push({ scopeType: 'VEHICLE', scopeId: vehicleId });
  if (driverId) checks.push({ scopeType: 'DRIVER', scopeId: driverId });
  if (tripId) checks.push({ scopeType: 'TRIP', scopeId: tripId });

  if (checks.length === 0) return;

  const allSatisfied = checks.every(c => scopeIncludesLevel(actor, c.scopeType, c.scopeId, requiredLevel));
  if (!allSatisfied) {
    deny(`Access denied: insufficient data scope (need ${requiredLevel} scope for target resources)`);
  }
}

export function assertCanReadResource(
  actor: ActorContext,
  resourceType: ResourceType,
  record: RecordWithRelations,
): void {
  const mapping = getResourceMapping(resourceType);
  checkPermission(actor, mapping.permissions.view);
  checkScopeForRecord(actor, resourceType, record, 'VIEW');
}

export function assertCanCreateResource(
  actor: ActorContext,
  resourceType: ResourceType,
  input: RecordWithRelations,
): void {
  const mapping = getResourceMapping(resourceType);
  checkPermission(actor, mapping.permissions.create);
  checkScopeForInput(actor, input, 'CREATE');
}

export function assertCanUpdateResource(
  actor: ActorContext,
  resourceType: ResourceType,
  record: RecordWithRelations,
): void {
  const mapping = getResourceMapping(resourceType);
  checkPermission(actor, mapping.permissions.update);
  checkScopeForRecord(actor, resourceType, record, 'UPDATE');
}

export function assertCanDeleteResource(
  actor: ActorContext,
  resourceType: ResourceType,
  record: RecordWithRelations,
): void {
  const mapping = getResourceMapping(resourceType);
  checkPermission(actor, mapping.permissions.delete);
  checkScopeForRecord(actor, resourceType, record, 'DELETE');
}

export function assertCanChangeResourceScope(
  actor: ActorContext,
  resourceType: ResourceType,
  currentRecord: RecordWithRelations,
  updateInput: RecordWithRelations,
): void {
  if (isGlobalUser(actor)) return;

  const mapping = getResourceMapping(resourceType);

  const currentVehicleId = currentRecord.vehicleId as string | null | undefined;
  const newVehicleId = updateInput.vehicleId as string | null | undefined;
  if (newVehicleId !== undefined && newVehicleId !== currentVehicleId) {
    if (!newVehicleId) {
      deny('Access denied: cannot remove vehicle reference');
    }
    checkScopeForInput(actor, { vehicleId: newVehicleId }, 'UPDATE');
  }

  const currentDriverId = currentRecord.driverId as string | null | undefined;
  const newDriverId = updateInput.driverId as string | null | undefined;
  if (newDriverId !== undefined && newDriverId !== currentDriverId) {
    if (newDriverId) {
      checkScopeForInput(actor, { driverId: newDriverId }, 'UPDATE');
    }
  }

  const currentTripId = currentRecord.tripId as string | null | undefined;
  const newTripId = updateInput.tripId as string | null | undefined;
  if (newTripId !== undefined && newTripId !== currentTripId) {
    if (newTripId) {
      checkScopeForInput(actor, { tripId: newTripId }, 'UPDATE');
    }
  }

  const currentLinkedEntityId = currentRecord.linkedEntityId as string | null | undefined;
  const newLinkedEntityId = updateInput.linkedEntityId as string | null | undefined;
  if (newLinkedEntityId !== undefined && newLinkedEntityId !== currentLinkedEntityId) {
    const linkedType = (updateInput.linkedEntityType || currentRecord.linkedEntityType) as string | undefined;
    if (linkedType === 'VEHICLE' && newLinkedEntityId) {
      checkScopeForInput(actor, { vehicleId: newLinkedEntityId }, 'UPDATE');
    }
  }

  if (resourceType === 'VEHICLE') {
    const currentId = currentRecord.id as string;
    const inputVehicleId = updateInput.vehicleId as string | undefined;
    if (inputVehicleId && inputVehicleId !== currentId) {
      deny('Access denied: cannot change vehicle identity');
    }
  }

  if (resourceType === 'DRIVER') {
    const currentId = currentRecord.id as string;
    const inputDriverId = updateInput.driverId as string | undefined;
    if (inputDriverId && inputDriverId !== currentId) {
      deny('Access denied: cannot change driver identity');
    }
  }
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
