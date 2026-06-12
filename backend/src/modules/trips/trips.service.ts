import { Prisma, TripStatus, TripHistoryAction } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../utils/appError';

function generateTripNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `TR-${timestamp}-${random}`;
}

const tripInclude = {
  vehicle: {
    select: {
      id: true,
      vehicleNumber: true,
      vehicleType: true,
      status: true,
    },
  },
  driver: {
    select: {
      id: true,
      name: true,
      mobile: true,
      status: true,
    },
  },
  assistantDriver: {
    select: {
      id: true,
      name: true,
      mobile: true,
      status: true,
    },
  },
  createdBy: {
    select: {
      id: true,
      name: true,
      email: true,
      username: true,
    },
  },
} satisfies Prisma.TripInclude;

const historyInclude = {
  createdBy: {
    select: {
      id: true,
      name: true,
      email: true,
      username: true,
    },
  },
} satisfies Prisma.TripHistoryInclude;

async function writeTripHistory(
  tripId: string,
  action: TripHistoryAction,
  userId: string | null | undefined,
  fromStatus?: TripStatus | null,
  toStatus?: TripStatus | null,
  remarks?: string | null,
  metadata?: Record<string, unknown>,
) {
  return prisma.tripHistory.create({
    data: {
      tripId,
      action,
      fromStatus: fromStatus ?? null,
      toStatus: toStatus ?? null,
      remarks: remarks ?? null,
      metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : undefined,
      createdById: userId ?? null,
    },
  });
}

async function validateVehicleExists(vehicleId: string) {
  const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
  if (!vehicle) {
    throw new AppError('Vehicle not found', 404);
  }
  return vehicle;
}

async function validateDriverExists(driverId: string) {
  const driver = await prisma.driver.findUnique({ where: { id: driverId } });
  if (!driver) {
    throw new AppError('Driver not found', 404);
  }
  return driver;
}

export async function listTrips(query: {
  search?: string;
  status?: string;
  tripType?: string;
  vehicleId?: string;
  driverId?: string;
  page: number;
  limit: number;
}) {
  const where: Prisma.TripWhereInput = {};

  if (query.search) {
    where.OR = [
      { tripNumber: { contains: query.search, mode: 'insensitive' } },
      { originName: { contains: query.search, mode: 'insensitive' } },
      { destinationName: { contains: query.search, mode: 'insensitive' } },
      { purpose: { contains: query.search, mode: 'insensitive' } },
    ];
  }

  if (query.status) {
    where.status = query.status as TripStatus;
  }

  if (query.tripType) {
    where.tripType = query.tripType as any;
  }

  if (query.vehicleId) {
    where.vehicleId = query.vehicleId;
  }

  if (query.driverId) {
    where.driverId = query.driverId;
  }

  const [items, total] = await Promise.all([
    prisma.trip.findMany({
      where,
      include: tripInclude,
      orderBy: { createdAt: 'desc' },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }),
    prisma.trip.count({ where }),
  ]);

  return {
    items,
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
    },
  };
}

export async function getTripById(tripId: string) {
  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    include: tripInclude,
  });

  if (!trip) {
    throw new AppError('Trip not found', 404);
  }

  return trip;
}

export async function createTrip(input: {
  tripNumber?: string;
  tripType: string;
  vehicleId: string;
  driverId?: string | null;
  assistantDriverId?: string | null;
  originName: string;
  originAddress?: string | null;
  destinationName: string;
  destinationAddress?: string | null;
  plannedStartAt?: string | null;
  plannedEndAt?: string | null;
  purpose?: string | null;
  notes?: string | null;
  createdById?: string | null;
}) {
  await validateVehicleExists(input.vehicleId);

  if (input.driverId) {
    await validateDriverExists(input.driverId);
  }

  if (input.assistantDriverId) {
    await validateDriverExists(input.assistantDriverId);
  }

  const tripNumber = input.tripNumber || generateTripNumber();

  const existingNumber = await prisma.trip.findUnique({
    where: { tripNumber },
  });

  if (existingNumber) {
    throw new AppError('Trip number already exists', 400);
  }

  const trip = await prisma.trip.create({
    data: {
      tripNumber,
      tripType: input.tripType as any,
      status: 'DRAFT',
      vehicleId: input.vehicleId,
      driverId: input.driverId || null,
      assistantDriverId: input.assistantDriverId || null,
      originName: input.originName,
      originAddress: input.originAddress || null,
      destinationName: input.destinationName,
      destinationAddress: input.destinationAddress || null,
      plannedStartAt: input.plannedStartAt ? new Date(input.plannedStartAt) : null,
      plannedEndAt: input.plannedEndAt ? new Date(input.plannedEndAt) : null,
      purpose: input.purpose || null,
      notes: input.notes || null,
      createdById: input.createdById || null,
    },
    include: tripInclude,
  });

  await writeTripHistory(trip.id, 'CREATED', input.createdById, null, 'DRAFT', 'Trip created', {
    tripNumber: trip.tripNumber,
    vehicleId: trip.vehicleId,
  });

  return trip;
}

export async function updateTrip(
  tripId: string,
  input: {
    tripType?: string;
    vehicleId?: string;
    driverId?: string | null;
    assistantDriverId?: string | null;
    originName?: string;
    originAddress?: string | null;
    destinationName?: string;
    destinationAddress?: string | null;
    plannedStartAt?: string | null;
    plannedEndAt?: string | null;
    startOdometer?: number | null;
    endOdometer?: number | null;
    distanceKm?: number | null;
    purpose?: string | null;
    notes?: string | null;
  },
  userId?: string | null,
) {
  const trip = await prisma.trip.findUnique({ where: { id: tripId } });

  if (!trip) {
    throw new AppError('Trip not found', 404);
  }

  if (trip.status === 'COMPLETED') {
    if (input.notes !== undefined) {
      const updated = await prisma.trip.update({
        where: { id: tripId },
        data: { notes: input.notes },
        include: tripInclude,
      });
      return updated;
    }
    throw new AppError('Completed trips cannot be edited', 400);
  }

  if (trip.status === 'CANCELLED') {
    throw new AppError('Cancelled trips cannot be edited', 400);
  }

  if (trip.status === 'STARTED') {
    const disallowedKeys = ['vehicleId', 'driverId', 'assistantDriverId', 'originName', 'originAddress', 'destinationName', 'destinationAddress'];
    for (const key of disallowedKeys) {
      if ((input as Record<string, unknown>)[key] !== undefined) {
        throw new AppError('Cannot modify route or assignment while trip is started', 400);
      }
    }
  }

  if (input.vehicleId) {
    await validateVehicleExists(input.vehicleId);
  }

  if (input.driverId) {
    await validateDriverExists(input.driverId);
  }

  if (input.assistantDriverId) {
    await validateDriverExists(input.assistantDriverId);
  }

  const historyActions: Promise<unknown>[] = [];
  const fromStatus = trip.status;

  if (input.vehicleId && input.vehicleId !== trip.vehicleId) {
    historyActions.push(
      writeTripHistory(tripId, 'VEHICLE_CHANGED', userId, fromStatus, null, 'Vehicle changed', {
        from: trip.vehicleId,
        to: input.vehicleId,
      }),
    );
  }

  if (input.driverId !== undefined && input.driverId !== trip.driverId) {
    historyActions.push(
      writeTripHistory(tripId, 'DRIVER_CHANGED', userId, fromStatus, null, 'Driver changed', {
        from: trip.driverId,
        to: input.driverId,
      }),
    );
  }

  const updated = await prisma.trip.update({
    where: { id: tripId },
    data: {
      tripType: input.tripType as any,
      vehicleId: input.vehicleId,
      driverId: input.driverId === undefined ? undefined : input.driverId,
      assistantDriverId: input.assistantDriverId === undefined ? undefined : input.assistantDriverId,
      originName: input.originName,
      originAddress: input.originAddress === undefined ? undefined : input.originAddress,
      destinationName: input.destinationName,
      destinationAddress: input.destinationAddress === undefined ? undefined : input.destinationAddress,
      plannedStartAt: input.plannedStartAt === undefined ? undefined : input.plannedStartAt ? new Date(input.plannedStartAt) : null,
      plannedEndAt: input.plannedEndAt === undefined ? undefined : input.plannedEndAt ? new Date(input.plannedEndAt) : null,
      startOdometer: input.startOdometer,
      endOdometer: input.endOdometer,
      distanceKm: input.distanceKm,
      purpose: input.purpose === undefined ? undefined : input.purpose,
      notes: input.notes === undefined ? undefined : input.notes,
    },
    include: tripInclude,
  });

  if (historyActions.length > 0) {
    await Promise.all(historyActions);
  }

  await writeTripHistory(tripId, 'UPDATED', userId, fromStatus, null, 'Trip updated');

  return updated;
}

export async function scheduleTrip(
  tripId: string,
  input: {
    plannedStartAt?: string | null;
    plannedEndAt?: string | null;
    driverId?: string | null;
    assistantDriverId?: string | null;
    notes?: string | null;
  },
  userId?: string | null,
) {
  const trip = await prisma.trip.findUnique({ where: { id: tripId } });

  if (!trip) {
    throw new AppError('Trip not found', 404);
  }

  if (trip.status !== 'DRAFT') {
    throw new AppError('Only draft trips can be scheduled', 400);
  }

  if (input.driverId) {
    await validateDriverExists(input.driverId);
  }

  if (input.assistantDriverId) {
    await validateDriverExists(input.assistantDriverId);
  }

  const updated = await prisma.trip.update({
    where: { id: tripId },
    data: {
      status: 'SCHEDULED',
      plannedStartAt: input.plannedStartAt ? new Date(input.plannedStartAt) : trip.plannedStartAt,
      plannedEndAt: input.plannedEndAt ? new Date(input.plannedEndAt) : trip.plannedEndAt,
      driverId: input.driverId !== undefined ? input.driverId : trip.driverId,
      assistantDriverId: input.assistantDriverId !== undefined ? input.assistantDriverId : trip.assistantDriverId,
      notes: input.notes !== undefined ? input.notes : trip.notes,
    },
    include: tripInclude,
  });

  await writeTripHistory(tripId, 'SCHEDULED', userId, 'DRAFT', 'SCHEDULED', 'Trip scheduled');

  return updated;
}

export async function startTrip(
  tripId: string,
  input: {
    startOdometer?: number;
    notes?: string | null;
  },
  userId?: string | null,
) {
  const trip = await prisma.trip.findUnique({ where: { id: tripId } });

  if (!trip) {
    throw new AppError('Trip not found', 404);
  }

  if (trip.status !== 'DRAFT' && trip.status !== 'SCHEDULED') {
    throw new AppError('Only draft or scheduled trips can be started', 400);
  }

  const vehicleConflict = await prisma.trip.findFirst({
    where: {
      vehicleId: trip.vehicleId,
      status: 'STARTED',
      id: { not: tripId },
    },
  });

  if (vehicleConflict) {
    throw new AppError('Vehicle is already assigned to another started trip', 400);
  }

  if (trip.driverId) {
    const driverConflict = await prisma.trip.findFirst({
      where: {
        driverId: trip.driverId,
        status: 'STARTED',
        id: { not: tripId },
      },
    });

    if (driverConflict) {
      throw new AppError('Driver is already assigned to another started trip', 400);
    }
  }

  const [updated] = await prisma.$transaction([
    prisma.trip.update({
      where: { id: tripId },
      data: {
        status: 'STARTED',
        actualStartAt: new Date(),
        startOdometer: input.startOdometer,
        notes: input.notes !== undefined ? input.notes : trip.notes,
      },
      include: tripInclude,
    }),
    prisma.vehicle.update({
      where: { id: trip.vehicleId },
      data: { status: 'ON_TRIP' },
    }),
    ...(trip.driverId
      ? [
          prisma.driver.update({
            where: { id: trip.driverId },
            data: { status: 'ON_TRIP' },
          }),
        ]
      : []),
  ]);

  await writeTripHistory(
    tripId,
    'STARTED',
    userId,
    trip.status,
    'STARTED',
    'Trip started',
    { startOdometer: input.startOdometer },
  );

  return updated;
}

export async function completeTrip(
  tripId: string,
  input: {
    endOdometer?: number;
    distanceKm?: number;
    notes?: string | null;
  },
  userId?: string | null,
) {
  const trip = await prisma.trip.findUnique({ where: { id: tripId } });

  if (!trip) {
    throw new AppError('Trip not found', 404);
  }

  if (trip.status !== 'STARTED') {
    throw new AppError('Only started trips can be completed', 400);
  }

  if (input.endOdometer !== undefined && input.endOdometer !== null && trip.startOdometer !== null) {
    if (input.endOdometer < trip.startOdometer) {
      throw new AppError('End odometer cannot be less than start odometer', 400);
    }
  }

  const distanceKm =
    input.distanceKm ??
    (input.endOdometer !== undefined && input.endOdometer !== null && trip.startOdometer !== null
      ? input.endOdometer - trip.startOdometer
      : null);

  const [updated] = await prisma.$transaction([
    prisma.trip.update({
      where: { id: tripId },
      data: {
        status: 'COMPLETED',
        actualEndAt: new Date(),
        endOdometer: input.endOdometer,
        distanceKm,
        notes: input.notes !== undefined ? input.notes : trip.notes,
      },
      include: tripInclude,
    }),
    prisma.vehicle.update({
      where: { id: trip.vehicleId },
      data: { status: 'AVAILABLE' },
    }),
    ...(trip.driverId
      ? [
          prisma.driver.update({
            where: { id: trip.driverId },
            data: { status: 'AVAILABLE' },
          }),
        ]
      : []),
  ]);

  await writeTripHistory(
    tripId,
    'COMPLETED',
    userId,
    'STARTED',
    'COMPLETED',
    'Trip completed',
    { endOdometer: input.endOdometer, distanceKm },
  );

  return updated;
}

export async function cancelTrip(
  tripId: string,
  input: { notes?: string | null },
  userId?: string | null,
) {
  const trip = await prisma.trip.findUnique({ where: { id: tripId } });

  if (!trip) {
    throw new AppError('Trip not found', 404);
  }

  if (trip.status === 'COMPLETED') {
    throw new AppError('Completed trips cannot be cancelled', 400);
  }

  if (trip.status === 'CANCELLED') {
    throw new AppError('Trip is already cancelled', 400);
  }

  const previousStatus = trip.status;

  const updateData: Prisma.TripUpdateInput = {
    status: 'CANCELLED',
    notes: input.notes !== undefined ? input.notes : trip.notes,
  };

  const updated = await prisma.trip.update({
    where: { id: tripId },
    data: updateData,
    include: tripInclude,
  });

  if (previousStatus === 'STARTED') {
    await prisma.vehicle.update({
      where: { id: trip.vehicleId },
      data: { status: 'AVAILABLE' },
    });

    if (trip.driverId) {
      await prisma.driver.update({
        where: { id: trip.driverId },
        data: { status: 'AVAILABLE' },
      });
    }
  }

  await writeTripHistory(
    tripId,
    'CANCELLED',
    userId,
    previousStatus,
    'CANCELLED',
    'Trip cancelled',
  );

  return updated;
}

export async function getTripHistory(tripId: string) {
  const trip = await prisma.trip.findUnique({ where: { id: tripId } });

  if (!trip) {
    throw new AppError('Trip not found', 404);
  }

  const history = await prisma.tripHistory.findMany({
    where: { tripId },
    include: historyInclude,
    orderBy: { createdAt: 'desc' },
  });

  return history;
}
