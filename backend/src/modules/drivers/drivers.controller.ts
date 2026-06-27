import { Request, Response } from 'express';
import { sendSuccess } from '../../utils/response';
import { createAuditLog } from '../audit/audit.service';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../utils/appError';
import {
  createDriver,
  getDriverById,
  getDriverByUser,
  listDrivers,
  updateDriver,
  updateDriverStatus,
  getDriverAssignment,
  assignVehicleToDriver,
  unassignVehicleFromDriver,
  getActiveDrivers,
} from './drivers.service';
import { getDriverActivity, getDriverEffectivePermissions, getDriverOperationsSummary, getDriverMenuPreview } from './driver-activity.service';

export async function listDriversController(req: Request, res: Response) {
  const result = await listDrivers({
    search: req.query.search as string | undefined,
    status: req.query.status as string | undefined,
    unlinkedOnly: req.query.unlinkedOnly === 'true',
    page: Number(req.query.page) || 1,
    limit: Number(req.query.limit) || 20,
  });
  return sendSuccess(res, result);
}

export async function getMyDriverProfileController(req: Request, res: Response) {
  const driver = await getDriverByUser(req.authUser!.id);
  return sendSuccess(res, driver);
}

export async function getDriverController(req: Request, res: Response) {
  const driver = await getDriverById(String(req.params.id));
  return sendSuccess(res, driver);
}

export async function createDriverController(req: Request, res: Response) {
  const result = await createDriver(req.body);
  const driver = result.driver;

  await createAuditLog(req, {
    userId: req.authUser?.id,
    action: 'driver.create',
    entityType: 'driver',
    entityId: driver.id,
    metadata: { name: driver.name, mobile: driver.mobile, accountCreated: !!result.account },
  });

  return sendSuccess(res, result, 'Driver created successfully', 201);
}

export async function updateDriverController(req: Request, res: Response) {
  const driver = await updateDriver(String(req.params.id), req.body);

  await createAuditLog(req, {
    userId: req.authUser?.id,
    action: 'driver.update',
    entityType: 'driver',
    entityId: driver.id,
    metadata: { name: driver.name },
  });

  return sendSuccess(res, driver, 'Driver updated successfully');
}

export async function updateDriverStatusController(req: Request, res: Response) {
  const driver = await updateDriverStatus(String(req.params.id), req.body.status);

  await createAuditLog(req, {
    userId: req.authUser?.id,
    action: 'driver.status_update',
    entityType: 'driver',
    entityId: driver.id,
    metadata: { status: driver.status },
  });

  return sendSuccess(res, driver, 'Driver status updated successfully');
}

export async function getDriverLinkedAccountController(req: Request, res: Response) {
  const driverId = String(req.params.id);

  const driver = await prisma.driver.findUnique({
    where: { id: driverId },
    select: { id: true, name: true },
  });

  if (!driver) {
    throw new AppError('Driver not found', 404);
  }

  const linkedUser = await prisma.user.findUnique({
    where: { userDriverId: driverId },
    select: {
      id: true,
      name: true,
      username: true,
      email: true,
      mobile: true,
      status: true,
      userDriverId: true,
      lastLoginAt: true,
      createdAt: true,
      updatedAt: true,
      role: { select: { id: true, name: true, key: true } },
    },
  });

  return sendSuccess(res, { driver: { id: driver.id, name: driver.name }, linkedUser });
}

export async function getDriverAssignmentController(req: Request, res: Response) {
  const result = await getDriverAssignment(String(req.params.id));
  return sendSuccess(res, result);
}

export async function assignVehicleController(req: Request, res: Response) {
  const { vehicleId } = req.body;
  if (!vehicleId) throw new AppError('vehicleId is required', 400);
  const result = await assignVehicleToDriver(String(req.params.id), vehicleId, req);
  return sendSuccess(res, result, 'Vehicle assigned to driver successfully');
}

export async function unassignVehicleController(req: Request, res: Response) {
  const result = await unassignVehicleFromDriver(String(req.params.id), req);
  return sendSuccess(res, result, 'Vehicle unassigned from driver successfully');
}

export async function getDriverActivityController(req: Request, res: Response) {
  const result = await getDriverActivity(String(req.params.id), {
    page: Number(req.query.page) || 1,
    limit: Number(req.query.limit) || 50,
  });
  return sendSuccess(res, result);
}

export async function getDriverEffectivePermissionsController(req: Request, res: Response) {
  const result = await getDriverEffectivePermissions(String(req.params.id));
  return sendSuccess(res, result);
}

export async function getDriverOperationsSummaryController(req: Request, res: Response) {
  const result = await getDriverOperationsSummary(String(req.params.id));
  return sendSuccess(res, result);
}

export async function getActiveDriversController(req: Request, res: Response) {
  const result = await getActiveDrivers();
  return sendSuccess(res, result);
}

export async function getDriverMenuPreviewController(req: Request, res: Response) {
  const result = await getDriverMenuPreview(String(req.params.id));
  return sendSuccess(res, result);
}
