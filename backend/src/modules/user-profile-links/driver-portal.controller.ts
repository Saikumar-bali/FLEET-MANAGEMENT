import { Request, Response } from 'express';
import { sendSuccess } from '../../utils/response';
import { AppError } from '../../utils/appError';
import { prisma } from '../../lib/prisma';
import { getDriverIdForUser } from '../user-profile-links/user-profile-links.service';

async function getLinkedDriver(userId: string) {
  const driverId = await getDriverIdForUser(userId);
  if (!driverId) {
    throw new AppError('No linked driver profile found. Link a driver profile to access portal features.', 404);
  }
  const driver = await prisma.driver.findUnique({ where: { id: driverId } });
  if (!driver) {
    throw new AppError('Linked driver profile no longer exists.', 404);
  }
  return driver;
}

export async function driverProfileController(req: Request, res: Response) {
  const driver = await getLinkedDriver(req.authUser!.id);
  return sendSuccess(res, driver);
}

export async function driverTripsController(req: Request, res: Response) {
  const driver = await getLinkedDriver(req.authUser!.id);
  const page = Number(req.query.page) || 1;
  const limit = Math.min(Number(req.query.limit) || 20, 100);

  const where = { driverId: driver.id };
  const [items, total] = await Promise.all([
    prisma.trip.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        vehicle: { select: { id: true, vehicleNumber: true, vehicleType: true } },
        driver: { select: { id: true, name: true, mobile: true } },
      },
    }),
    prisma.trip.count({ where }),
  ]);

  return sendSuccess(res, { items, total, page, limit, totalPages: Math.ceil(total / limit) });
}

export async function driverVehiclesController(req: Request, res: Response) {
  const driver = await getLinkedDriver(req.authUser!.id);

  const vehicles = await prisma.vehicle.findMany({
    where: {
      OR: [
        { currentDriverId: driver.id },
        { trips: { some: { driverId: driver.id } } },
      ],
    },
    select: {
      id: true,
      vehicleNumber: true,
      vehicleType: true,
      brand: true,
      model: true,
      status: true,
    },
    distinct: ['id'],
  });

  return sendSuccess(res, vehicles);
}

export async function driverDocumentsController(req: Request, res: Response) {
  const driver = await getLinkedDriver(req.authUser!.id);
  const page = Number(req.query.page) || 1;
  const limit = Math.min(Number(req.query.limit) || 20, 100);

  const where = { driverId: driver.id, documentStatus: 'ACTIVE' as const };
  const [items, total] = await Promise.all([
    prisma.document.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        documentType: true,
        documentCategory: true,
        expiryDate: true,
        verificationStatus: true,
        createdAt: true,
      },
    }),
    prisma.document.count({ where }),
  ]);

  return sendSuccess(res, { items, total, page, limit, totalPages: Math.ceil(total / limit) });
}

export async function driverFuelController(req: Request, res: Response) {
  const driver = await getLinkedDriver(req.authUser!.id);
  const page = Number(req.query.page) || 1;
  const limit = Math.min(Number(req.query.limit) || 20, 100);

  const where = { driverId: driver.id };
  const [items, total] = await Promise.all([
    prisma.fuelEntry.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { fuelDate: 'desc' },
      include: {
        vehicle: { select: { id: true, vehicleNumber: true } },
      },
    }),
    prisma.fuelEntry.count({ where }),
  ]);

  return sendSuccess(res, { items, total, page, limit, totalPages: Math.ceil(total / limit) });
}

export async function driverExpensesController(req: Request, res: Response) {
  const driver = await getLinkedDriver(req.authUser!.id);
  const page = Number(req.query.page) || 1;
  const limit = Math.min(Number(req.query.limit) || 20, 100);

  const where = { driverId: driver.id };
  const [items, total] = await Promise.all([
    prisma.expense.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { expenseDate: 'desc' },
      include: {
        vehicle: { select: { id: true, vehicleNumber: true } },
      },
    }),
    prisma.expense.count({ where }),
  ]);

  return sendSuccess(res, { items, total, page, limit, totalPages: Math.ceil(total / limit) });
}
