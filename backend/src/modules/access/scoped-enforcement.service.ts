import type { ActorContext, DataScopeEntry } from './actor-context.service';
import { can, hasScope, isGlobalUser } from './access-policy.service';
import { getResourceMapping, type ResourceType } from './resource-scope-map';
import { AppError } from '../../utils/appError';

import { prisma } from '../../lib/prisma';

type RecordWithRelations = Record<string, unknown>;

function deny(message: string): never {
  throw new AppError(message, 403);
}

function checkPermission(actor: ActorContext, permissionKey: string): void {
  if (!can(actor, permissionKey)) {
    deny(`Access denied: missing permission ${permissionKey}`);
  }
}

function scopeCanSatisfyLevel(ds: DataScopeEntry, requiredLevel: string): boolean {
  if (ds.accessLevel === 'MANAGE') return true;
  if (requiredLevel === 'VIEW') {
    return ds.accessLevel === 'VIEW' || ds.accessLevel === 'UPDATE' || ds.accessLevel === 'DELETE' || ds.accessLevel === 'MANAGE';
  }
  if (requiredLevel === 'CREATE') {
    return ds.accessLevel === 'CREATE' || ds.accessLevel === 'MANAGE';
  }
  if (requiredLevel === 'UPDATE') {
    return ds.accessLevel === 'UPDATE' || ds.accessLevel === 'MANAGE';
  }
  if (requiredLevel === 'DELETE') {
    return ds.accessLevel === 'DELETE' || ds.accessLevel === 'MANAGE';
  }
  return false;
}

function hasScopeAtLevel(actor: ActorContext, scopeType: string, scopeId: string, requiredLevel: string): boolean {
  if (actor.isSuperAdmin) return true;
  if (actor.dataScopes.some(ds => ds.scopeType === 'GLOBAL' && ds.accessLevel === 'MANAGE')) return true;
  return actor.dataScopes.some(ds => {
    if (ds.scopeType !== scopeType) return false;
    if (ds.scopeId !== null && ds.scopeId !== scopeId) return false;
    return scopeCanSatisfyLevel(ds, requiredLevel);
  });
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
  if (requiredLevel === 'VIEW' && createdById === actor.user.id) return;

  // Assignment-based access: e.g. a mechanic assigned to a repair can
  // view/update it without needing an explicit UserDataScope grant.
  // Deliberately excludes DELETE — being assigned the work doesn't mean
  // you can delete the record, same asymmetry as the owner shortcut above.
  if (mapping.assignedField) {
    const assignedToId = record[mapping.assignedField] as string | null | undefined;
    if (assignedToId && assignedToId === actor.user.id && requiredLevel !== 'DELETE') return;
  }

  if (resourceType === 'VEHICLE') {
    const recordId = record.id as string;
    if (recordId && hasScopeAtLevel(actor, 'VEHICLE', recordId, requiredLevel)) return;
    // Permission alone is sufficient for VIEW if no scope exists
    if (requiredLevel === 'VIEW' && actor.effectivePermissions.includes(mapping.permissions.view)) return;
    deny(`Access denied: insufficient data scope (need ${requiredLevel} on VEHICLE ${recordId})`);
  }

  if (resourceType === 'DRIVER') {
    const recordId = record.id as string;
    if (recordId && hasScopeAtLevel(actor, 'DRIVER', recordId, requiredLevel)) return;
    if (requiredLevel === 'VIEW' && actor.effectivePermissions.includes(mapping.permissions.view)) return;
    deny(`Access denied: insufficient data scope (need ${requiredLevel} on DRIVER ${recordId})`);
  }

  const vehicleId = record.vehicleId as string | null | undefined;
  const driverId = record.driverId as string | null | undefined;
  const tripId = record.tripId as string | null | undefined;

  if (vehicleId && hasScopeAtLevel(actor, 'VEHICLE', vehicleId, requiredLevel)) return;
  if (driverId && hasScopeAtLevel(actor, 'DRIVER', driverId, requiredLevel)) return;
  if (tripId && hasScopeAtLevel(actor, 'TRIP', tripId, requiredLevel)) return;

  // Profile-based access: users can view/update documents linked to their own profiles
  if (resourceType === 'DOCUMENT' && requiredLevel !== 'DELETE') {
    const staffProfileId = record.staffProfileId as string | null | undefined;
    if (staffProfileId && actor.ownProfileIds.staffProfileIds.includes(staffProfileId)) return;
    const recDriverId = record.driverId as string | null | undefined;
    if (recDriverId && actor.ownProfileIds.driverIds.includes(recDriverId)) return;
  }

  if (resourceType === 'TRIP') {
    const recordId = record.id as string;
    if (recordId && hasScopeAtLevel(actor, 'TRIP', recordId, requiredLevel)) return;
    if (requiredLevel === 'VIEW' && actor.effectivePermissions.includes(mapping.permissions.view)) return;
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

  const allSatisfied = checks.every(c => hasScopeAtLevel(actor, c.scopeType, c.scopeId, requiredLevel));
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

async function resolveLinkedEntityScope(
  actor: ActorContext,
  linkedType: string,
  linkedEntityId: string,
): Promise<RecordWithRelations> {
  switch (linkedType) {
    case 'FUEL_ENTRY':
    case 'FUEL': {
      const record = await prisma.fuelEntry.findUnique({ where: { id: linkedEntityId }, select: { vehicleId: true, driverId: true, tripId: true } });
      if (!record) deny(`Access denied: ${linkedType} ${linkedEntityId} not found`);
      return record as RecordWithRelations;
    }
    case 'EXPENSE': {
      const record = await prisma.expense.findUnique({ where: { id: linkedEntityId }, select: { vehicleId: true, driverId: true, tripId: true } });
      if (!record) deny(`Access denied: expense ${linkedEntityId} not found`);
      return record as RecordWithRelations;
    }
    case 'MAINTENANCE': {
      const record = await prisma.maintenanceRequest.findUnique({ where: { id: linkedEntityId }, select: { vehicleId: true, driverId: true, tripId: true } });
      if (!record) deny(`Access denied: maintenance ${linkedEntityId} not found`);
      return record as RecordWithRelations;
    }
    case 'REPAIR': {
      const record = await prisma.repair.findUnique({ where: { id: linkedEntityId }, select: { vehicleId: true, driverId: true, tripId: true } });
      if (!record) deny(`Access denied: repair ${linkedEntityId} not found`);
      return record as RecordWithRelations;
    }
    default:
      deny(`Access denied: cannot resolve linkedEntityType "${linkedType}"`);
  }
}

export async function assertCanChangeResourceScope(
  actor: ActorContext,
  resourceType: ResourceType,
  currentRecord: RecordWithRelations,
  updateInput: RecordWithRelations,
): Promise<void> {
  if (isGlobalUser(actor)) return;

  const currentVehicleId = currentRecord.vehicleId as string | null | undefined;
  const newVehicleId = updateInput.vehicleId as string | null | undefined;
  if (newVehicleId !== undefined && newVehicleId !== currentVehicleId) {
    if (!newVehicleId) deny('Access denied: cannot remove vehicle reference');
    checkScopeForInput(actor, { vehicleId: newVehicleId }, 'UPDATE');
  }

  const currentDriverId = currentRecord.driverId as string | null | undefined;
  const newDriverId = updateInput.driverId as string | null | undefined;
  if (newDriverId !== undefined && newDriverId !== currentDriverId) {
    if (newDriverId) checkScopeForInput(actor, { driverId: newDriverId }, 'UPDATE');
  }

  const currentTripId = currentRecord.tripId as string | null | undefined;
  const newTripId = updateInput.tripId as string | null | undefined;
  if (newTripId !== undefined && newTripId !== currentTripId) {
    if (newTripId) checkScopeForInput(actor, { tripId: newTripId }, 'UPDATE');
  }

  const currentLinkedEntityType = currentRecord.linkedEntityType as string | null | undefined;
  const currentLinkedEntityId = currentRecord.linkedEntityId as string | null | undefined;
  const newLinkedEntityType = updateInput.linkedEntityType as string | null | undefined;
  const newLinkedEntityId = updateInput.linkedEntityId as string | null | undefined;

  const effectiveLinkedEntityType = newLinkedEntityType ?? currentLinkedEntityType;
  const effectiveLinkedEntityId = newLinkedEntityId ?? currentLinkedEntityId;

  const linkedTypeChanged = newLinkedEntityType !== undefined && newLinkedEntityType !== currentLinkedEntityType;
  const linkedIdChanged = newLinkedEntityId !== undefined && newLinkedEntityId !== currentLinkedEntityId;

  if (linkedTypeChanged || linkedIdChanged) {
    if (effectiveLinkedEntityType && !effectiveLinkedEntityId) {
      deny('Access denied: linkedEntityType requires a linkedEntityId');
    }
    if (!effectiveLinkedEntityType && effectiveLinkedEntityId) {
      deny('Access denied: linkedEntityId requires a linkedEntityType');
    }
    if (effectiveLinkedEntityType && effectiveLinkedEntityId) {
      switch (effectiveLinkedEntityType) {
        case 'VEHICLE':
          checkScopeForInput(actor, { vehicleId: effectiveLinkedEntityId }, 'UPDATE');
          break;
        case 'DRIVER':
          checkScopeForInput(actor, { driverId: effectiveLinkedEntityId }, 'UPDATE');
          break;
        case 'TRIP':
          checkScopeForInput(actor, { tripId: effectiveLinkedEntityId }, 'UPDATE');
          break;
        case 'FUEL_ENTRY':
        case 'FUEL':
        case 'EXPENSE':
        case 'MAINTENANCE':
        case 'REPAIR': {
          const resolved = await resolveLinkedEntityScope(actor, effectiveLinkedEntityType, effectiveLinkedEntityId);
          checkScopeForInput(actor, resolved, 'UPDATE');
          break;
        }
        default:
          deny(`Access denied: unknown linkedEntityType "${effectiveLinkedEntityType}"`);
      }
    }
  }

  if (resourceType === 'VEHICLE') {
    const inputVehicleId = updateInput.vehicleId as string | undefined;
    if (inputVehicleId && inputVehicleId !== currentRecord.id) deny('Access denied: cannot change vehicle identity');
  }
  if (resourceType === 'DRIVER') {
    const inputDriverId = updateInput.driverId as string | undefined;
    if (inputDriverId && inputDriverId !== currentRecord.id) deny('Access denied: cannot change driver identity');
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

  if (mapping.assignedField) {
    conditions.push({ [mapping.assignedField]: actor.user.id });
  }

  if (mapping.relationFields.vehicleId) {
    const vField = mapping.relationFields.vehicleId;
    const vehicleScopeIds = actor.dataScopes
      .filter(ds => ds.scopeType === 'VEHICLE' && ds.scopeId !== null && scopeCanSatisfyLevel(ds, 'VIEW'))
      .map(ds => ds.scopeId!);
    if (vehicleScopeIds.length > 0) {
      conditions.push({ [vField]: { in: vehicleScopeIds } });
    }
  }

  if (mapping.relationFields.driverId) {
    const dField = mapping.relationFields.driverId;
    const driverScopeIds = actor.dataScopes
      .filter(ds => ds.scopeType === 'DRIVER' && ds.scopeId !== null && scopeCanSatisfyLevel(ds, 'VIEW'))
      .map(ds => ds.scopeId!);
    if (driverScopeIds.length > 0) {
      conditions.push({ [dField]: { in: driverScopeIds } });
    }
  }

  if (mapping.relationFields.tripId && scopeType === 'TRIP') {
    const tripField = mapping.relationFields.tripId;
    const tripScopeIds = actor.dataScopes
      .filter(ds => ds.scopeType === 'TRIP' && ds.scopeId !== null && scopeCanSatisfyLevel(ds, 'VIEW'))
      .map(ds => ds.scopeId!);
    if (tripScopeIds.length > 0) {
      conditions.push({ [tripField]: { in: tripScopeIds } });
    }
  }

  // Profile-based access: users see documents linked to their own profiles
  if (resourceType === 'DOCUMENT') {
    if (actor.ownProfileIds.staffProfileIds.length > 0) {
      conditions.push({ staffProfileId: { in: actor.ownProfileIds.staffProfileIds } });
    }
    if (actor.ownProfileIds.driverIds.length > 0) {
      conditions.push({ driverId: { in: actor.ownProfileIds.driverIds } });
    }
  }

  if (conditions.length === 0) {
    // If the user has the view permission for this resource, don't scope-restrict.
    // Data scopes are an additional filter, not a gate — permission alone is sufficient.
    const viewPerm = mapping.permissions.view;
    if (viewPerm && actor.effectivePermissions.includes(viewPerm)) return undefined;
    return { id: '__NO_ACCESS__' };
  }
  if (conditions.length === 1) return conditions[0];
  return { OR: conditions };
}
