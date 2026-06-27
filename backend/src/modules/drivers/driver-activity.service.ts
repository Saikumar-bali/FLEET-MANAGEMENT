import { prisma } from '../../lib/prisma';
import { AppError } from '../../utils/appError';
import { getEffectivePermissions } from '../permissions/effective-permissions.service';

export async function getDriverActivity(driverId: string, query: { page?: number; limit?: number }) {
  const driver = await prisma.driver.findUnique({ where: { id: driverId } });
  if (!driver) throw new AppError('Driver not found', 404);

  const page = query.page || 1;
  const limit = query.limit || 50;

  const user = await prisma.user.findFirst({ where: { userDriverId: driverId }, select: { id: true } });
  if (!user) throw new AppError('Driver has no linked user account', 404);

  const [items, total] = await Promise.all([
    prisma.auditLog.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      select: { id: true, action: true, entityType: true, entityId: true, metadata: true, ipAddress: true, userAgent: true, createdAt: true },
    }),
    prisma.auditLog.count({ where: { userId: user.id } }),
  ]);

  return {
    items,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

export async function getDriverEffectivePermissions(driverId: string) {
  const user = await prisma.user.findFirst({ where: { userDriverId: driverId }, select: { id: true } });
  if (!user) throw new AppError('Driver has no linked user account', 404);
  return getEffectivePermissions(user.id);
}

export async function getDriverOperationsSummary(driverId: string) {
  const driver = await prisma.driver.findUnique({ where: { id: driverId } });
  if (!driver) throw new AppError('Driver not found', 404);

  const user = await prisma.user.findFirst({ where: { userDriverId: driverId }, select: { id: true, lastLoginAt: true, status: true } });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [currentVehicle, activeTrip, todayTrips, todayFuel, todayExpenses, recentActivity] = await Promise.all([
    prisma.vehicle.findFirst({ where: { currentDriverId: driverId }, select: { id: true, vehicleNumber: true, vehicleType: true, status: true } }),
    prisma.trip.findFirst({ where: { driverId, status: 'STARTED' }, select: { id: true, tripNumber: true, originName: true, destinationName: true, vehicle: { select: { vehicleNumber: true } } } }),
    prisma.trip.count({ where: { driverId, createdAt: { gte: today } } }),
    prisma.fuelEntry.count({ where: { driverId, createdAt: { gte: today } } }),
    prisma.expense.count({ where: { driverId, createdAt: { gte: today } } }),
    user ? prisma.auditLog.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' }, take: 5, select: { action: true, entityType: true, entityId: true, createdAt: true } }) : [],
  ]);

  const effectivePermissions = user ? await getEffectivePermissions(user.id) : null;

  return {
    driver: { id: driver.id, name: driver.name, status: driver.status },
    linkedUser: user ? { id: user.id, status: user.status, lastLoginAt: user.lastLoginAt?.toISOString() ?? null } : null,
    currentVehicle,
    activeTrip,
    todayStats: { trips: todayTrips, fuel: todayFuel, expenses: todayExpenses },
    effectivePermissionsCount: effectivePermissions?.effectivePermissions.length ?? 0,
    recentActivity,
  };
}
