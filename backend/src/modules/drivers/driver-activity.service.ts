import { prisma } from '../../lib/prisma';
import { AppError } from '../../utils/appError';
import { getEffectivePermissions } from '../permissions/effective-permissions.service';
import { DRIVER_MENU_PREVIEW_ITEMS } from '../../constants/driver-capabilities';

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

export async function getDriverMenuPreview(driverId: string) {
  const driver = await prisma.driver.findUnique({ where: { id: driverId } });
  if (!driver) throw new AppError('Driver not found', 404);

  const user = await prisma.user.findFirst({
    where: { userDriverId: driverId },
    select: { id: true, name: true, username: true, status: true, lastLoginAt: true },
  });

  const effective = user ? await getEffectivePermissions(user.id) : null;
  const effectiveKeys = new Set(effective?.effectivePermissions ?? []);

  const vehicle = await prisma.vehicle.findFirst({ where: { currentDriverId: driverId }, select: { id: true, vehicleNumber: true } });

  const visibleMenus: { label: string; path: string }[] = [];
  const hiddenMenus: { label: string; path: string; requiredPermission: string }[] = [];

  for (const item of DRIVER_MENU_PREVIEW_ITEMS) {
    if (item.alwaysVisible || !item.permission || effectiveKeys.has(item.permission)) {
      visibleMenus.push({ label: item.label, path: item.path });
    } else {
      hiddenMenus.push({ label: item.label, path: item.path, requiredPermission: item.permission });
    }
  }

  const requiredPermissions = ['driver_trip_create', 'driver_assigned_vehicle_view', 'driver_quick_fuel_create', 'driver_fuel_receipt_upload', 'driver_expense_create', 'driver_vehicle_inspection_create', 'driver_vehicle_issue_report', 'driver_maintenance_report_create', 'driver_repair_report_create'];
  const missingCommon = requiredPermissions.filter((p) => !effectiveKeys.has(p));

  return {
    driver: { id: driver.id, name: driver.name, status: driver.status },
    linkedUser: user ? { id: user.id, username: user.username, status: user.status, lastLoginAt: user.lastLoginAt?.toISOString() ?? null } : null,
    accountStatus: user?.status ?? 'NO_ACCOUNT',
    vehicleStatus: vehicle ? { id: vehicle.id, vehicleNumber: vehicle.vehicleNumber } : null,
    effectivePermissions: effective?.effectivePermissions ?? [],
    rolePermissions: effective?.rolePermissions ?? [],
    allowOverrides: effective?.userAllowedPermissions ?? [],
    denyOverrides: effective?.userDeniedPermissions ?? [],
    visibleMenus,
    hiddenMenus,
    missingCommonCapabilities: missingCommon,
  };
}
