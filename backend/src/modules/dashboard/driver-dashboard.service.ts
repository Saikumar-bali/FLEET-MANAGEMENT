import { prisma } from '../../lib/prisma';
import { AppError } from '../../utils/appError';

export async function getDriverDashboard(params: {
  userDriverId?: string;
  queryDriverId?: string;
  roleKey: string;
}) {
  const { userDriverId, queryDriverId, roleKey } = params;

  let driverId: string;

  if (roleKey === 'driver') {
    if (!userDriverId) {
      throw new AppError('Driver account is not linked to a driver profile.', 403);
    }
    driverId = userDriverId;
  } else {
    if (!queryDriverId) {
      throw new AppError('driverId query parameter is required for admin/manager users.', 400);
    }
    driverId = queryDriverId;
  }

  const driver = await prisma.driver.findUnique({
    where: { id: driverId },
  });

  if (!driver) {
    throw new AppError('Driver not found', 404);
  }

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  const [
    currentVehicle,
    activeTrip,
    activeTripCount,
    completedTripCount,
    totalTripCount,
    fuelStatsThisMonth,
    recentFuelEntries,
    recentExpenses,
    driverDocuments,
    expiringDocuments,
    recentTrips,
  ] = await Promise.all([
    prisma.vehicle.findFirst({
      where: { currentDriverId: driverId },
    }),
    prisma.trip.findFirst({
      where: { driverId, status: 'STARTED' },
      include: {
        vehicle: { select: { id: true, vehicleNumber: true, vehicleType: true, status: true } },
      },
    }),
    prisma.trip.count({ where: { driverId, status: 'STARTED' } }),
    prisma.trip.count({
      where: { driverId, status: 'COMPLETED', updatedAt: { gte: startOfMonth } },
    }),
    prisma.trip.count({ where: { driverId } }),
    prisma.fuelEntry.aggregate({
      _sum: { totalAmount: true, quantityLiters: true },
      _count: true,
      where: {
        driverId,
        fuelDate: { gte: startOfMonth, lte: endOfMonth },
      },
    }),
    prisma.fuelEntry.findMany({
      where: { driverId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        vehicle: { select: { id: true, vehicleNumber: true, vehicleType: true, status: true } },
        trip: { select: { id: true, tripNumber: true, vehicleId: true } },
      },
    }),
    prisma.expense.findMany({
      where: { driverId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        vehicle: { select: { id: true, vehicleNumber: true, vehicleType: true, status: true } },
        trip: { select: { id: true, tripNumber: true, vehicleId: true } },
      },
    }),
    prisma.document.findMany({
      where: { driverId, documentStatus: { not: 'DELETED' } },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: {
        vehicle: { select: { id: true, vehicleNumber: true } },
        trip: { select: { id: true, tripNumber: true } },
      },
    }),
    prisma.document.findMany({
      where: {
        driverId,
        documentStatus: 'ACTIVE',
        expiryDate: { gte: now, lte: new Date(now.getTime() + 30 * 86400000) },
      },
      orderBy: { expiryDate: 'asc' },
      take: 10,
    }),
    prisma.trip.findMany({
      where: { driverId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        vehicle: { select: { id: true, vehicleNumber: true, vehicleType: true, status: true } },
      },
    }),
  ]);

  const recentFuelReceipts = recentFuelEntries
    .filter((f) => f.stationName || f.receiptNumber)
    .map((f) => ({
      id: f.id,
      fuelDate: f.fuelDate.toISOString(),
      totalAmount: Number(f.totalAmount),
      stationName: f.stationName,
      receiptNumber: f.receiptNumber,
    }));

  return {
    driver,
    currentVehicle,
    activeTrip: activeTrip ? {
      ...activeTrip,
      actualStartAt: activeTrip.actualStartAt?.toISOString() ?? null,
      plannedStartAt: activeTrip.plannedStartAt?.toISOString() ?? null,
      plannedEndAt: activeTrip.plannedEndAt?.toISOString() ?? null,
      actualEndAt: activeTrip.actualEndAt?.toISOString() ?? null,
      createdAt: activeTrip.createdAt.toISOString(),
      updatedAt: activeTrip.updatedAt.toISOString(),
    } : null,
    tripStats: {
      active: activeTripCount,
      completedThisMonth: completedTripCount,
      total: totalTripCount,
    },
    fuelStatsThisMonth: {
      count: fuelStatsThisMonth._count,
      totalAmount: Number(fuelStatsThisMonth._sum?.totalAmount ?? 0),
      totalLiters: Number(fuelStatsThisMonth._sum?.quantityLiters ?? 0),
    },
    recentFuelEntries: recentFuelEntries.map((f) => ({
      ...f,
      totalAmount: Number(f.totalAmount),
      quantityLiters: f.quantityLiters ? Number(f.quantityLiters) : null,
      pricePerLiter: f.pricePerLiter ? Number(f.pricePerLiter) : null,
      fuelDate: f.fuelDate.toISOString(),
      approvedAt: f.approvedAt?.toISOString() ?? null,
      createdAt: f.createdAt.toISOString(),
      updatedAt: f.updatedAt.toISOString(),
    })),
    recentFuelReceipts,
    recentExpenses: recentExpenses.map((e) => ({
      ...e,
      amount: Number(e.amount),
      expenseDate: e.expenseDate.toISOString(),
      approvedAt: e.approvedAt?.toISOString() ?? null,
      createdAt: e.createdAt.toISOString(),
      updatedAt: e.updatedAt.toISOString(),
    })),
    driverDocuments: driverDocuments.map((d) => ({
      ...d,
      issueDate: d.issueDate?.toISOString() ?? null,
      expiryDate: d.expiryDate?.toISOString() ?? null,
      createdAt: d.createdAt.toISOString(),
      updatedAt: d.updatedAt.toISOString(),
    })),
    expiringDocuments: expiringDocuments.map((d) => ({
      ...d,
      issueDate: d.issueDate?.toISOString() ?? null,
      expiryDate: d.expiryDate?.toISOString() ?? null,
      createdAt: d.createdAt.toISOString(),
      updatedAt: d.updatedAt.toISOString(),
    })),
    recentTrips: recentTrips.map((t) => ({
      ...t,
      plannedStartAt: t.plannedStartAt?.toISOString() ?? null,
      actualStartAt: t.actualStartAt?.toISOString() ?? null,
      plannedEndAt: t.plannedEndAt?.toISOString() ?? null,
      actualEndAt: t.actualEndAt?.toISOString() ?? null,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    })),
    alerts: [],
  };
}
