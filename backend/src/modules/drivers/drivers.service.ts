import crypto from 'node:crypto';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../utils/appError';
import { hashPassword } from '../../utils/auth';
import { createAuditLog } from '../audit/audit.service';
import { getEffectivePermissions } from '../permissions/effective-permissions.service';
import type { Prisma } from '@prisma/client';
import type { Request } from 'express';

export async function listDrivers(query: { search?: string; status?: string; unlinkedOnly?: boolean; page: number; limit: number }) {
  const where: Prisma.DriverWhereInput = {};

  if (query.search) {
    where.OR = [
      { name: { contains: query.search, mode: 'insensitive' } },
      { mobile: { contains: query.search, mode: 'insensitive' } },
      { licenseNumber: { contains: query.search, mode: 'insensitive' } },
    ];
  }

  if (query.status) {
    where.status = query.status as any;
  }

  if (query.unlinkedOnly) {
    where.linkedUsers = { none: {} };
  }

  const [items, total] = await Promise.all([
    prisma.driver.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }),
    prisma.driver.count({ where }),
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

export async function getDriverById(driverId: string) {
  const driver = await prisma.driver.findUnique({
    where: { id: driverId },
  });

  if (!driver) {
    throw new AppError('Driver not found', 404);
  }

  return driver;
}

export async function createDriver(input: {
  name: string;
  mobile: string;
  alternateMobile?: string | null;
  licenseNumber: string;
  licenseExpiry?: string | null;
  address?: string | null;
  emergencyContact?: string | null;
  experienceYears?: number | null;
  status?: string;
  createUserAccount?: boolean;
}) {
  const existingMobile = await prisma.driver.findUnique({
    where: { mobile: input.mobile },
  });

  if (existingMobile) {
    throw new AppError('Mobile number already exists', 400);
  }

  const existingLicense = await prisma.driver.findUnique({
    where: { licenseNumber: input.licenseNumber },
  });

  if (existingLicense) {
    throw new AppError('License number already exists', 400);
  }

  const driver = await prisma.driver.create({
    data: {
      name: input.name,
      mobile: input.mobile,
      alternateMobile: input.alternateMobile || null,
      licenseNumber: input.licenseNumber,
      licenseExpiry: input.licenseExpiry ? new Date(input.licenseExpiry) : null,
      address: input.address || null,
      emergencyContact: input.emergencyContact || null,
      experienceYears: input.experienceYears || null,
      status: (input.status as any) ?? 'AVAILABLE',
    },
  });

  // Optionally create linked user account
  if (input.createUserAccount) {
    const driverRole = await prisma.role.findUnique({
      where: { key: 'driver' },
    });
    if (!driverRole) {
      throw new AppError('Driver role not found in system', 500);
    }

    const baseName = input.name.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 15);
    const mobileSuffix = input.mobile.slice(-4);
    const username = `driver-${baseName}-${mobileSuffix}`;
    const tempPassword = crypto.randomBytes(6).toString('hex');

    await prisma.user.create({
      data: {
        name: input.name,
        username,
        email: `${username}@driver.internal`,
        mobile: input.mobile,
        passwordHash: await hashPassword(tempPassword),
        roleId: driverRole.id,
        status: 'ACTIVE',
        userDriverId: driver.id,
      },
    });

    return { driver, account: { username, tempPassword } };
  }

  return { driver };
}

export async function updateDriver(
  driverId: string,
  input: {
    name?: string;
    mobile?: string;
    alternateMobile?: string | null;
    licenseNumber?: string;
    licenseExpiry?: string | null;
    address?: string | null;
    emergencyContact?: string | null;
    experienceYears?: number | null;
    status?: string;
  },
) {
  const driver = await prisma.driver.findUnique({
    where: { id: driverId },
  });

  if (!driver) {
    throw new AppError('Driver not found', 404);
  }

  if (input.mobile && input.mobile !== driver.mobile) {
    const existingMobile = await prisma.driver.findUnique({
      where: { mobile: input.mobile },
    });

    if (existingMobile) {
      throw new AppError('Mobile number already exists', 400);
    }
  }

  if (input.licenseNumber && input.licenseNumber !== driver.licenseNumber) {
    const existingLicense = await prisma.driver.findUnique({
      where: { licenseNumber: input.licenseNumber },
    });

    if (existingLicense) {
      throw new AppError('License number already exists', 400);
    }
  }

  return prisma.driver.update({
    where: { id: driverId },
    data: {
      name: input.name,
      mobile: input.mobile,
      alternateMobile: input.alternateMobile === '' ? null : input.alternateMobile,
      licenseNumber: input.licenseNumber,
      licenseExpiry: input.licenseExpiry ? new Date(input.licenseExpiry) : input.licenseExpiry === '' ? null : undefined,
      address: input.address === '' ? null : input.address,
      emergencyContact: input.emergencyContact === '' ? null : input.emergencyContact,
      experienceYears: input.experienceYears,
      status: input.status as any,
    },
  });
}

export async function getDriverByUser(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { userDriverId: true },
  });

  if (!user || !user.userDriverId) {
    throw new AppError('Driver account is not linked to a driver profile', 403);
  }

  const driver = await prisma.driver.findUnique({
    where: { id: user.userDriverId },
  });

  if (!driver) {
    throw new AppError('Linked driver not found', 404);
  }

  return driver;
}

export async function updateDriverStatus(driverId: string, status: string) {
  const driver = await prisma.driver.findUnique({
    where: { id: driverId },
  });

  if (!driver) {
    throw new AppError('Driver not found', 404);
  }

  return prisma.driver.update({
    where: { id: driverId },
    data: { status: status as any },
  });
}

export async function getDriverAssignment(driverId: string) {
  const driver = await prisma.driver.findUnique({
    where: { id: driverId },
    include: { vehicles: { select: { id: true, vehicleNumber: true, vehicleType: true, status: true, currentOdometer: true } } },
  });
  if (!driver) throw new AppError('Driver not found', 404);

  const user = await prisma.user.findFirst({
    where: { userDriverId: driverId },
    select: { id: true, name: true, username: true, status: true, lastLoginAt: true },
  });

  const activeTrip = await prisma.trip.findFirst({
    where: { driverId, status: 'STARTED' },
    select: { id: true, tripNumber: true, originName: true, destinationName: true },
  });

  return { driver: { id: driver.id, name: driver.name, status: driver.status }, linkedUser: user, assignedVehicles: driver.vehicles, activeTrip };
}

export async function assignVehicleToDriver(driverId: string, vehicleId: string, req: Request | null) {
  const driver = await prisma.driver.findUnique({ where: { id: driverId } });
  if (!driver) throw new AppError('Driver not found', 404);
  if (driver.status === 'INACTIVE' || driver.status === 'SUSPENDED') throw new AppError('Driver must be active or available to assign a vehicle', 400);

  const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
  if (!vehicle) throw new AppError('Vehicle not found', 404);

  if (vehicle.currentDriverId && vehicle.currentDriverId !== driverId) {
    throw new AppError('Vehicle is already assigned to another driver', 400);
  }

  await prisma.vehicle.update({ where: { id: vehicleId }, data: { currentDriverId: driverId } });

  await createAuditLog(req, {
    userId: null,
    action: 'driver.vehicle.assign',
    entityType: 'driver',
    entityId: driverId,
    metadata: { vehicleId, vehicleNumber: vehicle.vehicleNumber, driverName: driver.name },
  });

  return { vehicle: await prisma.vehicle.findUnique({ where: { id: vehicleId } }) };
}

export async function unassignVehicleFromDriver(driverId: string, req: Request | null) {
  const driver = await prisma.driver.findUnique({ where: { id: driverId } });
  if (!driver) throw new AppError('Driver not found', 404);

  const vehicle = await prisma.vehicle.findFirst({ where: { currentDriverId: driverId } });
  if (!vehicle) throw new AppError('No vehicle assigned to this driver', 400);

  await prisma.vehicle.update({ where: { id: vehicle.id }, data: { currentDriverId: null } });

  await createAuditLog(req, {
    userId: null,
    action: 'driver.vehicle.unassign',
    entityType: 'driver',
    entityId: driverId,
    metadata: { vehicleId: vehicle.id, vehicleNumber: vehicle.vehicleNumber, driverName: driver.name },
  });

  return { message: 'Vehicle unassigned', vehicle: { id: vehicle.id, vehicleNumber: vehicle.vehicleNumber } };
}

export async function getActiveDrivers() {
  const drivers = await prisma.driver.findMany({
    where: { status: { not: 'INACTIVE' } },
    orderBy: { name: 'asc' },
    include: {
      linkedUsers: {
        select: { id: true, name: true, username: true, status: true, lastLoginAt: true, role: { select: { name: true, key: true } } },
      },
      vehicles: {
        select: { id: true, vehicleNumber: true, vehicleType: true, status: true },
      },
    },
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const results = await Promise.all(
    drivers.map(async (driver) => {
      const linkedUser = driver.linkedUsers[0] || null;
      const currentVehicle = driver.vehicles[0] || null;

      const [activeTrip, todayTrips, todayFuel, todayExpenses] = await Promise.all([
        prisma.trip.findFirst({ where: { driverId: driver.id, status: 'STARTED' }, select: { id: true, tripNumber: true } }),
        prisma.trip.count({ where: { driverId: driver.id, createdAt: { gte: today } } }),
        prisma.fuelEntry.count({ where: { driverId: driver.id, createdAt: { gte: today } } }),
        prisma.expense.count({ where: { driverId: driver.id, createdAt: { gte: today } } }),
      ]);

      let effectivePermissionsCount = 0;
      if (linkedUser) {
        const ep = await getEffectivePermissions(linkedUser.id);
        effectivePermissionsCount = ep.effectivePermissions.length;
      }

      let recentAction = null;
      if (linkedUser) {
        const log = await prisma.auditLog.findFirst({ where: { userId: linkedUser.id }, orderBy: { createdAt: 'desc' }, select: { action: true, createdAt: true } });
        recentAction = log ? { action: log.action, at: log.createdAt.toISOString() } : null;
      }

      let statusLabel: string = driver.status;
      if (!linkedUser) statusLabel = 'NO_ACCOUNT';
      else if (!currentVehicle) statusLabel = 'NO_VEHICLE';
      else if (activeTrip) statusLabel = 'ON_TRIP';
      else if (linkedUser.status !== 'ACTIVE') statusLabel = 'OFFLINE';

      return {
        id: driver.id,
        name: driver.name,
        mobile: driver.mobile,
        status: driver.status,
        statusLabel,
        linkedAccount: linkedUser ? { id: linkedUser.id, username: linkedUser.username, status: linkedUser.status, lastLoginAt: linkedUser.lastLoginAt?.toISOString() ?? null } : null,
        currentVehicle: currentVehicle ? { id: currentVehicle.id, vehicleNumber: currentVehicle.vehicleNumber, vehicleType: currentVehicle.vehicleType, status: currentVehicle.status } : null,
        activeTrip,
        effectivePermissionsCount,
        recentAction,
        todayStats: { trips: todayTrips, fuel: todayFuel, expenses: todayExpenses },
      };
    }),
  );

  return results;
}
