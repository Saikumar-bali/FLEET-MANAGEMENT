import { prisma } from '../../lib/prisma';
import { AppError } from '../../utils/appError';
import { createNotification } from '../notifications/notifications.service';

const ROUTE_ESTIMATES: Record<string, Record<string, { distanceKm: number; durationMin: number }>> = {
  mumbai: {
    pune: { distanceKm: 150, durationMin: 180 },
    delhi: { distanceKm: 1400, durationMin: 960 },
    ahmedabad: { distanceKm: 530, durationMin: 480 },
  },
  pune: {
    mumbai: { distanceKm: 150, durationMin: 180 },
  },
  delhi: {
    mumbai: { distanceKm: 1400, durationMin: 960 },
    agra: { distanceKm: 230, durationMin: 240 },
  },
  ahmedabad: {
    mumbai: { distanceKm: 530, durationMin: 480 },
  },
  agra: {
    delhi: { distanceKm: 230, durationMin: 240 },
  },
};

export async function getBoardData() {
  const [vehicles, drivers, unassignedTrips, scheduledTrips] = await Promise.all([
    prisma.vehicle.findMany({ orderBy: { vehicleNumber: 'asc' } }),
    prisma.driver.findMany({ orderBy: { name: 'asc' } }),
    prisma.trip.findMany({ where: { status: 'DRAFT', driverId: null }, include: { vehicle: { select: { id: true, vehicleNumber: true } } }, orderBy: { createdAt: 'desc' } }),
    prisma.trip.count({ where: { status: { in: ['SCHEDULED', 'STARTED'] }, plannedStartAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } } }),
  ]);

  const availableVehicles = vehicles.filter((v) => v.status === 'AVAILABLE');
  const unavailableVehicles = vehicles.filter((v) => v.status !== 'AVAILABLE').map((v) => ({
    vehicle: v,
    reason: vehicleUnavailableReason(v.status),
  }));

  const availableDrivers = drivers.filter((d) => d.status === 'AVAILABLE');
  const unavailableDrivers = drivers.filter((d) => d.status !== 'AVAILABLE').map((d) => ({
    driver: d,
    reason: driverUnavailableReason(d.status),
  }));

  return {
    availableVehicles,
    unavailableVehicles,
    availableDrivers,
    unavailableDrivers,
    unassignedTrips,
    summary: {
      availableVehicles: availableVehicles.length,
      availableDrivers: availableDrivers.length,
      unassignedTrips: unassignedTrips.length,
      scheduledToday: scheduledTrips,
    },
  };
}

function vehicleUnavailableReason(status: string): string {
  switch (status) {
    case 'ON_TRIP': return 'Currently on a trip';
    case 'UNDER_MAINTENANCE': return 'Under maintenance';
    case 'UNDER_REPAIR': return 'Under repair';
    case 'INACTIVE': return 'Inactive';
    case 'SOLD': return 'Sold';
    case 'ACCIDENT': return 'Involved in accident';
    case 'CHECKED_OUT': return 'Checked out';
    default: return `Status: ${status}`;
  }
}

function driverUnavailableReason(status: string): string {
  switch (status) {
    case 'ON_TRIP': return 'Currently on a trip';
    case 'ON_LEAVE': return 'On leave';
    case 'SUSPENDED': return 'Suspended';
    case 'INACTIVE': return 'Inactive';
    default: return `Status: ${status}`;
  }
}

export type ConflictCheckInput = {
  tripId?: string | null;
  driverId?: string | null;
  vehicleId?: string | null;
  plannedStartAt?: string | null;
  plannedEndAt?: string | null;
};

export type Conflict = {
  type: 'DRIVER_TIME' | 'DRIVER_UNAVAILABLE' | 'VEHICLE_TIME' | 'VEHICLE_UNAVAILABLE';
  message: string;
  severity: 'HARD' | 'SOFT';
};

export async function checkConflicts(input: ConflictCheckInput) {
  const conflicts: Conflict[] = [];

  if (input.driverId) {
    const driver = await prisma.driver.findUnique({ where: { id: input.driverId } });
    if (!driver) throw new AppError('Driver not found', 404);
    if (driver.status !== 'AVAILABLE') {
      conflicts.push({ type: 'DRIVER_UNAVAILABLE', message: `Driver ${driver.name} is ${driverUnavailableReason(driver.status).toLowerCase()}`, severity: 'HARD' });
    }

    if (driver && input.plannedStartAt && input.plannedEndAt) {
      const start = new Date(input.plannedStartAt);
      const end = new Date(input.plannedEndAt);
      const overlapping = await prisma.trip.findFirst({
        where: {
          driverId: input.driverId,
          id: input.tripId ? { not: input.tripId } : undefined,
          status: { in: ['SCHEDULED', 'STARTED'] },
          plannedStartAt: { lte: end },
          plannedEndAt: { gte: start },
        },
        select: { id: true, tripNumber: true, plannedStartAt: true, plannedEndAt: true },
      });
      if (overlapping) {
        conflicts.push({
          type: 'DRIVER_TIME',
          message: `Driver ${driver.name} already assigned to ${overlapping.tripNumber} (${overlapping.plannedStartAt?.toISOString().slice(0, 10) ?? '?'} - ${overlapping.plannedEndAt?.toISOString().slice(0, 10) ?? '?'})`,
          severity: 'HARD',
        });
      }
    }
  }

  if (input.vehicleId) {
    const vehicle = await prisma.vehicle.findUnique({ where: { id: input.vehicleId } });
    if (!vehicle) throw new AppError('Vehicle not found', 404);
    if (vehicle.status !== 'AVAILABLE') {
      conflicts.push({ type: 'VEHICLE_UNAVAILABLE', message: `Vehicle ${vehicle.vehicleNumber} is ${vehicleUnavailableReason(vehicle.status).toLowerCase()}`, severity: 'HARD' });
    }

    if (vehicle && input.plannedStartAt && input.plannedEndAt) {
      const start = new Date(input.plannedStartAt);
      const end = new Date(input.plannedEndAt);
      const overlapping = await prisma.trip.findFirst({
        where: {
          vehicleId: input.vehicleId,
          id: input.tripId ? { not: input.tripId } : undefined,
          status: { in: ['SCHEDULED', 'STARTED'] },
          plannedStartAt: { lte: end },
          plannedEndAt: { gte: start },
        },
        select: { id: true, tripNumber: true, plannedStartAt: true, plannedEndAt: true },
      });
      if (overlapping) {
        conflicts.push({
          type: 'VEHICLE_TIME',
          message: `Vehicle ${vehicle.vehicleNumber} already assigned to ${overlapping.tripNumber} (${overlapping.plannedStartAt?.toISOString().slice(0, 10) ?? '?'} - ${overlapping.plannedEndAt?.toISOString().slice(0, 10) ?? '?'})`,
          severity: 'HARD',
        });
      }
    }
  }

  return { hasConflict: conflicts.length > 0, conflicts };
}

export async function assignTrip(tripId: string, driverId: string, vehicleId: string, userId: string) {
  const trip = await prisma.trip.findUnique({ where: { id: tripId }, include: { vehicle: true, driver: true } });
  if (!trip) throw new AppError('Trip not found', 404);
  if (trip.status !== 'DRAFT') throw new AppError('Only draft trips can be assigned', 400);

  const driver = await prisma.driver.findUnique({ where: { id: driverId } });
  if (!driver) throw new AppError('Driver not found', 404);
  if (driver.status !== 'AVAILABLE') throw new AppError(`Driver ${driver.name} is not available`, 400);

  const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
  if (!vehicle) throw new AppError('Vehicle not found', 404);
  if (vehicle.status !== 'AVAILABLE') throw new AppError(`Vehicle ${vehicle.vehicleNumber} is not available`, 400);

  const conflictCheck = await checkConflicts({ tripId, driverId, vehicleId, plannedStartAt: trip.plannedStartAt?.toISOString() ?? null, plannedEndAt: trip.plannedEndAt?.toISOString() ?? null });
  if (conflictCheck.hasConflict) {
    throw new AppError(`Cannot assign: ${conflictCheck.conflicts.map((c) => c.message).join('; ')}`, 409);
  }

  const updated = await prisma.$transaction(async (tx) => {
    const updatedTrip = await tx.trip.update({
      where: { id: tripId },
      data: { driverId, vehicleId, status: 'SCHEDULED' },
      include: { vehicle: true, driver: true },
    });

    await tx.driver.update({ where: { id: driverId }, data: { status: 'ON_TRIP' } });

    await tx.vehicle.update({ where: { id: vehicleId }, data: { status: 'ON_TRIP', currentDriverId: driverId } });

    await tx.tripHistory.create({
      data: {
        tripId,
        action: 'SCHEDULED',
        fromStatus: 'DRAFT',
        toStatus: 'SCHEDULED',
        remarks: `Dispatcher assigned Driver: ${driver.name}, Vehicle: ${vehicle.vehicleNumber}`,
        createdById: userId,
      },
    });

    return updatedTrip;
  });

  const linkedUsers = await prisma.$queryRawUnsafe<Array<{ userId: string }>>(
    'SELECT user_id AS "userId" FROM user_profile_links WHERE profile_type::text=$1 AND profile_id=$2 AND status::text=$3',
    'DRIVER', driverId, 'ACTIVE',
  );

  if (linkedUsers.length > 0) {
    await createNotification({
      title: 'Trip assigned',
      message: `Trip ${updated.tripNumber} has been assigned to you.`,
      category: 'TRIP',
      severity: 'INFO',
      actionUrl: `/driver-portal/trips`,
      recipientPolicy: { type: 'USER', userIds: linkedUsers.map((r) => r.userId) },
      createdById: userId,
    });
  }

  await createNotification({
    title: 'Trip dispatched',
    message: `Trip ${updated.tripNumber} was dispatched to ${driver.name} with ${vehicle.vehicleNumber}.`,
    category: 'TRIP',
    severity: 'INFO',
    actionUrl: `/trips/${updated.id}`,
    recipientPolicy: { type: 'GLOBAL', includeRoles: ['super_admin', 'admin', 'manager', 'supervisor'] },
    createdById: userId,
  });

  return updated;
}

export async function getRouteEstimate(origin: string, destination: string) {
  const originKey = origin.toLowerCase().trim();
  const destKey = destination.toLowerCase().trim();

  const estimate = ROUTE_ESTIMATES[originKey]?.[destKey];
  if (estimate) {
    return {
      origin,
      destination,
      distanceKm: estimate.distanceKm,
      estimatedDurationMin: estimate.durationMin,
      status: 'AVAILABLE',
    };
  }

  return {
    origin,
    destination,
    distanceKm: null,
    estimatedDurationMin: null,
    status: 'UNAVAILABLE',
    message: 'Route estimation unavailable. Please enter manually.',
  };
}
