import { prisma } from '../../lib/prisma';
import { AppError } from '../../utils/appError';

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
