import { prisma } from '../../lib/prisma';
import { AppError } from '../../utils/appError';
import type { RequestUser } from '../../types/auth';

async function getDriverIdFromUser(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { userDriverId: true },
  });

  if (!user || !user.userDriverId) {
    throw new AppError('Driver account is not linked to a driver profile.', 403);
  }

  return user.userDriverId;
}

function generateTripNumber(): string {
  const prefix = 'TRIP';
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${ts}-${rand}`;
}

export async function createMyTrip(authUser: RequestUser, input: {
  tripType: string;
  originName: string;
  destinationName: string;
  vehicleId?: string;
  plannedStartAt?: string;
  notes?: string;
}) {
  const driverId = await getDriverIdFromUser(authUser.id);

  // Determine vehicle: must be assigned to this driver
  let vehicleId = input.vehicleId;

  if (vehicleId) {
    // If vehicleId provided, verify it is assigned to this driver
    const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
    if (!vehicle) {
      throw new AppError('Vehicle not found', 404);
    }
    if (vehicle.currentDriverId !== driverId) {
      throw new AppError('Vehicle is not assigned to you', 403);
    }
  } else {
    // Auto-select assigned vehicle
    const assignedVehicle = await prisma.vehicle.findFirst({
      where: { currentDriverId: driverId },
    });
    if (assignedVehicle) {
      vehicleId = assignedVehicle.id;
    }
  }

  if (!vehicleId) {
    throw new AppError('No vehicle specified and no vehicle assigned to you. Contact your administrator.', 400);
  }

  // Generate trip number
  const tripNumber = generateTripNumber();

  const trip = await prisma.trip.create({
    data: {
      tripNumber,
      tripType: input.tripType as any,
      status: 'DRAFT',
      vehicleId,
      driverId,
      originName: input.originName,
      destinationName: input.destinationName,
      plannedStartAt: input.plannedStartAt ? new Date(input.plannedStartAt) : null,
      notes: input.notes || null,
      createdById: authUser.id,
    },
    include: {
      vehicle: { select: { id: true, vehicleNumber: true, vehicleType: true, status: true } },
      driver: { select: { id: true, name: true, mobile: true, status: true } },
    },
  });

  return {
    ...trip,
    plannedStartAt: trip.plannedStartAt?.toISOString() ?? null,
    actualStartAt: trip.actualStartAt?.toISOString() ?? null,
    plannedEndAt: trip.plannedEndAt?.toISOString() ?? null,
    actualEndAt: trip.actualEndAt?.toISOString() ?? null,
    createdAt: trip.createdAt.toISOString(),
    updatedAt: trip.updatedAt.toISOString(),
  };
}

export async function getMyTrips(userId: string, query: { status?: string; page: number; limit: number }) {
  const driverId = await getDriverIdFromUser(userId);

  const where: any = { driverId };
  if (query.status) {
    where.status = query.status;
  }

  const [items, total] = await Promise.all([
    prisma.trip.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      include: {
        vehicle: { select: { id: true, vehicleNumber: true, vehicleType: true, status: true } },
        driver: { select: { id: true, name: true, mobile: true, status: true } },
        assistantDriver: { select: { id: true, name: true, mobile: true, status: true } },
        createdBy: { select: { id: true, name: true, email: true, username: true } },
      },
    }),
    prisma.trip.count({ where }),
  ]);

  return {
    items: items.map((t) => ({
      ...t,
      plannedStartAt: t.plannedStartAt?.toISOString() ?? null,
      actualStartAt: t.actualStartAt?.toISOString() ?? null,
      plannedEndAt: t.plannedEndAt?.toISOString() ?? null,
      actualEndAt: t.actualEndAt?.toISOString() ?? null,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    })),
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
    },
  };
}

export async function getMyFuelEntries(userId: string, query: { page: number; limit: number }) {
  const driverId = await getDriverIdFromUser(userId);

  const [items, total] = await Promise.all([
    prisma.fuelEntry.findMany({
      where: { driverId },
      orderBy: { createdAt: 'desc' },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      include: {
        vehicle: { select: { id: true, vehicleNumber: true, vehicleType: true, status: true } },
        trip: { select: { id: true, tripNumber: true, vehicleId: true } },
      },
    }),
    prisma.fuelEntry.count({ where: { driverId } }),
  ]);

  return {
    items: items.map((f) => ({
      ...f,
      totalAmount: Number(f.totalAmount),
      quantityLiters: f.quantityLiters ? Number(f.quantityLiters) : null,
      pricePerLiter: f.pricePerLiter ? Number(f.pricePerLiter) : null,
      fuelDate: f.fuelDate.toISOString(),
      approvedAt: f.approvedAt?.toISOString() ?? null,
      createdAt: f.createdAt.toISOString(),
      updatedAt: f.updatedAt.toISOString(),
    })),
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
    },
  };
}

export async function getMyExpenses(userId: string, query: { page: number; limit: number }) {
  const driverId = await getDriverIdFromUser(userId);

  const [items, total] = await Promise.all([
    prisma.expense.findMany({
      where: { driverId },
      orderBy: { createdAt: 'desc' },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      include: {
        vehicle: { select: { id: true, vehicleNumber: true, vehicleType: true, status: true } },
        trip: { select: { id: true, tripNumber: true, vehicleId: true } },
      },
    }),
    prisma.expense.count({ where: { driverId } }),
  ]);

  return {
    items: items.map((e) => ({
      ...e,
      amount: Number(e.amount),
      expenseDate: e.expenseDate.toISOString(),
      approvedAt: e.approvedAt?.toISOString() ?? null,
      createdAt: e.createdAt.toISOString(),
      updatedAt: e.updatedAt.toISOString(),
    })),
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
    },
  };
}

export async function getMyDocuments(userId: string, query: { page: number; limit: number }) {
  const driverId = await getDriverIdFromUser(userId);

  const [items, total] = await Promise.all([
    prisma.document.findMany({
      where: { driverId, documentStatus: { not: 'DELETED' } },
      orderBy: { createdAt: 'desc' },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      include: {
        vehicle: { select: { id: true, vehicleNumber: true } },
        trip: { select: { id: true, tripNumber: true } },
        uploadedBy: { select: { id: true, name: true, email: true } },
        verifiedBy: { select: { id: true, name: true } },
      },
    }),
    prisma.document.count({ where: { driverId, documentStatus: { not: 'DELETED' } } }),
  ]);

  return {
    items: items.map((d) => ({
      ...d,
      issueDate: d.issueDate?.toISOString() ?? null,
      expiryDate: d.expiryDate?.toISOString() ?? null,
      createdAt: d.createdAt.toISOString(),
      updatedAt: d.updatedAt.toISOString(),
    })),
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
    },
  };
}

export async function getMyVehicle(userId: string) {
  const driverId = await getDriverIdFromUser(userId);

  const vehicle = await prisma.vehicle.findFirst({
    where: { currentDriverId: driverId },
  });

  return vehicle;
}

export async function getMyTripById(userId: string, tripId: string) {
  const driverId = await getDriverIdFromUser(userId);
  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    include: {
      vehicle: { select: { id: true, vehicleNumber: true, vehicleType: true, status: true } },
      driver: { select: { id: true, name: true, mobile: true, status: true } },
    },
  });
  if (!trip || trip.driverId !== driverId) {
    throw new AppError('Trip not found', 404);
  }
  return {
    ...trip,
    plannedStartAt: trip.plannedStartAt?.toISOString() ?? null,
    actualStartAt: trip.actualStartAt?.toISOString() ?? null,
    plannedEndAt: trip.plannedEndAt?.toISOString() ?? null,
    actualEndAt: trip.actualEndAt?.toISOString() ?? null,
    createdAt: trip.createdAt.toISOString(),
    updatedAt: trip.updatedAt.toISOString(),
  };
}

export async function startMyTrip(userId: string, tripId: string) {
  const driverId = await getDriverIdFromUser(userId);
  const trip = await prisma.trip.findUnique({ where: { id: tripId } });
  if (!trip || trip.driverId !== driverId) throw new AppError('Trip not found', 404);
  if (trip.status !== 'DRAFT' && trip.status !== 'SCHEDULED') throw new AppError('Trip cannot be started from current status', 400);
  return prisma.trip.update({
    where: { id: tripId },
    data: { status: 'STARTED', actualStartAt: new Date() },
  });
}

export async function endMyTrip(userId: string, tripId: string) {
  const driverId = await getDriverIdFromUser(userId);
  const trip = await prisma.trip.findUnique({ where: { id: tripId } });
  if (!trip || trip.driverId !== driverId) throw new AppError('Trip not found', 404);
  if (trip.status !== 'STARTED') throw new AppError('Trip must be started before ending', 400);
  return prisma.trip.update({
    where: { id: tripId },
    data: { status: 'COMPLETED', actualEndAt: new Date() },
  });
}

export async function cancelMyTrip(userId: string, tripId: string) {
  const driverId = await getDriverIdFromUser(userId);
  const trip = await prisma.trip.findUnique({ where: { id: tripId } });
  if (!trip || trip.driverId !== driverId) throw new AppError('Trip not found', 404);
  if (!['DRAFT', 'SCHEDULED', 'STARTED'].includes(trip.status)) throw new AppError('Trip cannot be cancelled from current status', 400);
  return prisma.trip.update({
    where: { id: tripId },
    data: { status: 'CANCELLED', actualEndAt: new Date() },
  });
}

export async function createMyFuelEntry(userId: string, input: {
  vehicleId?: string;
  tripId?: string;
  totalAmount: number;
  quantityLiters?: number;
  fuelType?: string;
  stationName?: string;
  receiptNumber?: string;
  notes?: string;
}) {
  const driverId = await getDriverIdFromUser(userId);
  let vehicleId = input.vehicleId;
  if (!vehicleId) {
    const v = await prisma.vehicle.findFirst({ where: { currentDriverId: driverId } });
    if (v) vehicleId = v.id;
  }
  if (!vehicleId) throw new AppError('No vehicle specified and no assigned vehicle found', 400);
  const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
  if (!vehicle || vehicle.currentDriverId !== driverId) throw new AppError('Vehicle not assigned to you', 403);

  if (input.tripId) {
    const trip = await prisma.trip.findUnique({ where: { id: input.tripId } });
    if (!trip || trip.driverId !== driverId) throw new AppError('Trip not found', 404);
  }
  return prisma.fuelEntry.create({
    data: {
      vehicleId, driverId, tripId: input.tripId || null,
      fuelDate: new Date(), fuelType: input.fuelType || 'DIESEL',
      entryMode: input.quantityLiters ? 'FULL_DETAILS' : 'QUICK_AMOUNT',
      quantityLiters: input.quantityLiters || null,
      totalAmount: input.totalAmount,
      stationName: input.stationName || null,
      receiptNumber: input.receiptNumber || null,
      notes: input.notes || null,
      status: 'DRAFT',
      createdById: userId,
    },
  });
}

export async function createMyExpense(userId: string, input: {
  vehicleId?: string;
  tripId?: string;
  category: string;
  amount: number;
  expenseDate?: string;
  vendor?: string;
  receiptNumber?: string;
  notes?: string;
}) {
  const driverId = await getDriverIdFromUser(userId);
  let vehicleId = input.vehicleId;
  if (!vehicleId) {
    const v = await prisma.vehicle.findFirst({ where: { currentDriverId: driverId } });
    if (v) vehicleId = v.id;
  }
  if (!vehicleId) throw new AppError('No vehicle specified', 400);
  if (input.tripId) {
    const trip = await prisma.trip.findUnique({ where: { id: input.tripId } });
    if (!trip || trip.driverId !== driverId) throw new AppError('Trip not found', 404);
  }
  return prisma.expense.create({
    data: {
      vehicleId, driverId, tripId: input.tripId || null,
      category: input.category, amount: input.amount,
      expenseDate: input.expenseDate ? new Date(input.expenseDate) : new Date(),
      vendor: input.vendor || null, receiptNumber: input.receiptNumber || null,
      notes: input.notes || null, status: 'DRAFT', createdById: userId,
    },
  });
}

export async function createMyMaintenanceReport(userId: string, input: {
  vehicleId?: string; tripId?: string;
  category: string; description: string; priority?: string;
}) {
  const driverId = await getDriverIdFromUser(userId);
  let vehicleId = input.vehicleId;
  if (!vehicleId) {
    const v = await prisma.vehicle.findFirst({ where: { currentDriverId: driverId } });
    if (v) vehicleId = v.id;
  }
  if (!vehicleId) throw new AppError('No vehicle specified', 400);
  return prisma.maintenanceRequest.create({
    data: {
      vehicleId, driverId, tripId: input.tripId || null,
      requestDate: new Date(), category: input.category,
      description: input.description, priority: (input.priority as any) || 'MEDIUM',
      status: 'DRAFT', createdById: userId,
    },
  });
}

export async function createMyRepairReport(userId: string, input: {
  vehicleId?: string; tripId?: string;
  category: string; description: string;
}) {
  const driverId = await getDriverIdFromUser(userId);
  let vehicleId = input.vehicleId;
  if (!vehicleId) {
    const v = await prisma.vehicle.findFirst({ where: { currentDriverId: driverId } });
    if (v) vehicleId = v.id;
  }
  if (!vehicleId) throw new AppError('No vehicle specified', 400);
  return prisma.repair.create({
    data: {
      vehicleId, driverId, tripId: input.tripId || null,
      repairDate: new Date(), category: input.category,
      description: input.description, status: 'OPEN', createdById: userId,
    },
  });
}
