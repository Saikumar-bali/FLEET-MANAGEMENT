import { Request, Response } from 'express';
import { sendSuccess } from '../../utils/response';
import { createAuditLog } from '../audit/audit.service';
import {
  createDriver,
  getDriverById,
  listDrivers,
  updateDriver,
  updateDriverStatus,
} from './drivers.service';

export async function listDriversController(req: Request, res: Response) {
  const result = await listDrivers({
    search: req.query.search as string | undefined,
    status: req.query.status as string | undefined,
    page: Number(req.query.page) || 1,
    limit: Number(req.query.limit) || 20,
  });
  return sendSuccess(res, result);
}

export async function getDriverController(req: Request, res: Response) {
  const driver = await getDriverById(String(req.params.id));
  return sendSuccess(res, driver);
}

export async function createDriverController(req: Request, res: Response) {
  const driver = await createDriver(req.body);

  await createAuditLog(req, {
    userId: req.authUser?.id,
    action: 'driver.create',
    entityType: 'driver',
    entityId: driver.id,
    metadata: { name: driver.name, mobile: driver.mobile },
  });

  return sendSuccess(res, driver, 'Driver created successfully', 201);
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
