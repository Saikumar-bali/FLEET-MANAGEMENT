import { Request, Response } from 'express';
import { sendSuccess } from '../../utils/response';
import { createAuditLog } from '../audit/audit.service';
import {
  createVehicle,
  getVehicleById,
  listVehicles,
  updateVehicle,
  updateVehicleStatus,
  deleteVehicle,
} from './vehicles.service';

export async function listVehiclesController(req: Request, res: Response) {
  const result = await listVehicles({
    search: req.query.search as string | undefined,
    status: req.query.status as string | undefined,
    page: Number(req.query.page) || 1,
    limit: Number(req.query.limit) || 20,
  });
  return sendSuccess(res, result);
}

export async function getVehicleController(req: Request, res: Response) {
  const vehicle = await getVehicleById(String(req.params.id));
  return sendSuccess(res, vehicle);
}

export async function createVehicleController(req: Request, res: Response) {
  const vehicle = await createVehicle(req.body);

  await createAuditLog(req, {
    userId: req.authUser?.id,
    action: 'vehicle.create',
    entityType: 'vehicle',
    entityId: vehicle.id,
    metadata: { vehicleNumber: vehicle.vehicleNumber },
  });

  return sendSuccess(res, vehicle, 'Vehicle created successfully', 201);
}

export async function updateVehicleController(req: Request, res: Response) {
  const vehicle = await updateVehicle(String(req.params.id), req.body);

  await createAuditLog(req, {
    userId: req.authUser?.id,
    action: 'vehicle.update',
    entityType: 'vehicle',
    entityId: vehicle.id,
    metadata: { vehicleNumber: vehicle.vehicleNumber },
  });

  return sendSuccess(res, vehicle, 'Vehicle updated successfully');
}

export async function updateVehicleStatusController(req: Request, res: Response) {
  const vehicle = await updateVehicleStatus(String(req.params.id), req.body.status);

  await createAuditLog(req, {
    userId: req.authUser?.id,
    action: 'vehicle.status_update',
    entityType: 'vehicle',
    entityId: vehicle.id,
    metadata: { status: vehicle.status },
  });

  return sendSuccess(res, vehicle, 'Vehicle status updated successfully');
}

export async function deleteVehicleController(req: Request, res: Response) {
  await deleteVehicle(String(req.params.id));

  await createAuditLog(req, {
    userId: req.authUser?.id,
    action: 'vehicle.delete',
    entityType: 'vehicle',
    entityId: String(req.params.id),
  });

  return sendSuccess(res, { deleted: true }, 'Vehicle deleted successfully');
}
