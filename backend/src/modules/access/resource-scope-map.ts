import type { ActorContext } from './actor-context.service';

export type ResourceType =
  | 'TRIP'
  | 'VEHICLE'
  | 'DRIVER'
  | 'FUEL_ENTRY'
  | 'EXPENSE'
  | 'DOCUMENT'
  | 'MAINTENANCE'
  | 'REPAIR';

export type ResourceMapping = {
  resourceType: ResourceType;
  prismaModel: string;
  scopeType: string;
  permissions: {
    view: string;
    create: string;
    update: string;
    delete: string;
  };
  relationFields: {
    vehicleId?: string;
    driverId?: string;
    tripId?: string;
    createdById?: string;
  };
  ownerField?: string;
};

export const RESOURCE_MAP: Record<ResourceType, ResourceMapping> = {
  TRIP: {
    resourceType: 'TRIP',
    prismaModel: 'trip',
    scopeType: 'TRIP',
    permissions: {
      view: 'trip_view',
      create: 'trip_create',
      update: 'trip_update',
      delete: 'trip_delete',
    },
    relationFields: {
      vehicleId: 'vehicleId',
      driverId: 'driverId',
      tripId: 'id',
      createdById: 'createdById',
    },
    ownerField: 'createdById',
  },
  VEHICLE: {
    resourceType: 'VEHICLE',
    prismaModel: 'vehicle',
    scopeType: 'VEHICLE',
    permissions: {
      view: 'vehicle_view',
      create: 'vehicle_create',
      update: 'vehicle_update',
      delete: 'vehicle_delete',
    },
    relationFields: {
      vehicleId: 'id',
      createdById: undefined,
    },
  },
  DRIVER: {
    resourceType: 'DRIVER',
    prismaModel: 'driver',
    scopeType: 'DRIVER',
    permissions: {
      view: 'driver_view',
      create: 'driver_create',
      update: 'driver_update',
      delete: 'driver_delete',
    },
    relationFields: {
      driverId: 'id',
      createdById: undefined,
    },
  },
  FUEL_ENTRY: {
    resourceType: 'FUEL_ENTRY',
    prismaModel: 'fuelEntry',
    scopeType: 'VEHICLE',
    permissions: {
      view: 'fuel_view',
      create: 'fuel_create',
      update: 'fuel_update',
      delete: 'fuel_delete',
    },
    relationFields: {
      vehicleId: 'vehicleId',
      driverId: 'driverId',
      tripId: 'tripId',
      createdById: 'createdById',
    },
    ownerField: 'createdById',
  },
  EXPENSE: {
    resourceType: 'EXPENSE',
    prismaModel: 'expense',
    scopeType: 'VEHICLE',
    permissions: {
      view: 'expense_view',
      create: 'expense_create',
      update: 'expense_update',
      delete: 'expense_delete',
    },
    relationFields: {
      vehicleId: 'vehicleId',
      driverId: 'driverId',
      tripId: 'tripId',
      createdById: 'createdById',
    },
    ownerField: 'createdById',
  },
  DOCUMENT: {
    resourceType: 'DOCUMENT',
    prismaModel: 'document',
    scopeType: 'VEHICLE',
    permissions: {
      view: 'documents_view',
      create: 'documents_upload',
      update: 'documents_update',
      delete: 'documents_delete',
    },
    relationFields: {
      vehicleId: 'vehicleId',
      driverId: 'driverId',
      tripId: 'tripId',
      createdById: 'uploadedById',
    },
    ownerField: 'uploadedById',
  },
  MAINTENANCE: {
    resourceType: 'MAINTENANCE',
    prismaModel: 'maintenanceRequest',
    scopeType: 'VEHICLE',
    permissions: {
      view: 'maintenance_view',
      create: 'maintenance_create',
      update: 'maintenance_update',
      delete: 'maintenance_delete',
    },
    relationFields: {
      vehicleId: 'vehicleId',
      driverId: 'driverId',
      tripId: 'tripId',
      createdById: 'createdById',
    },
    ownerField: 'createdById',
  },
  REPAIR: {
    resourceType: 'REPAIR',
    prismaModel: 'repair',
    scopeType: 'VEHICLE',
    permissions: {
      view: 'repair_view',
      create: 'repair_create',
      update: 'repair_update',
      delete: 'repair_delete',
    },
    relationFields: {
      vehicleId: 'vehicleId',
      driverId: 'driverId',
      tripId: 'tripId',
      createdById: 'createdById',
    },
    ownerField: 'createdById',
  },
};

export function getResourceMapping(resourceType: ResourceType): ResourceMapping {
  const mapping = RESOURCE_MAP[resourceType];
  if (!mapping) throw new Error(`Unknown resource type: ${resourceType}`);
  return mapping;
}
