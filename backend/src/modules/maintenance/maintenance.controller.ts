import { Request, Response } from 'express';
import { sendSuccess } from '../../utils/response';
import { createAuditLog } from '../audit/audit.service';
import * as s from './maintenance.service';

export async function listMaintenanceController(req: Request, res: Response) {
  return sendSuccess(res, await s.listMaintenance({ ...req.query, page: Number(req.query.page) || 1, limit: Number(req.query.limit) || 20 }));
}

export async function getMaintenanceController(req: Request, res: Response) {
  return sendSuccess(res, await s.getMaintenance(String(req.params.id)));
}

export async function createMaintenanceController(req: Request, res: Response) {
  const item = await s.createMaintenance({ ...req.body, createdById: req.authUser?.id });
  await createAuditLog(req, { userId: req.authUser?.id, action: 'maintenance.create', entityType: 'maintenance', entityId: item.id });
  return sendSuccess(res, item, 'Maintenance request created successfully', 201);
}

export async function updateMaintenanceController(req: Request, res: Response) {
  const item = await s.updateMaintenance(String(req.params.id), req.body);
  await createAuditLog(req, { userId: req.authUser?.id, action: 'maintenance.update', entityType: 'maintenance', entityId: item.id });
  return sendSuccess(res, item, 'Maintenance request updated successfully');
}

async function action(req: Request, res: Response, status: any, actionName: string) {
  const item = await s.transitionMaintenance(String(req.params.id), status, req.authUser?.id, req.body.notes);
  const metadata = req.body.notes ? { notes: req.body.notes } : undefined;
  await createAuditLog(req, { userId: req.authUser?.id, action: `maintenance.${actionName}`, entityType: 'maintenance', entityId: item.id, metadata });
  return sendSuccess(res, item, `Maintenance request ${actionName}ed successfully`);
}

export const submitMaintenanceController = (req: Request, res: Response) => action(req, res, 'SUBMITTED', 'submit');
export const approveMaintenanceController = (req: Request, res: Response) => action(req, res, 'APPROVED', 'approve');
export const rejectMaintenanceController = (req: Request, res: Response) => action(req, res, 'REJECTED', 'reject');
export const startMaintenanceController = (req: Request, res: Response) => action(req, res, 'IN_PROGRESS', 'start');
export const completeMaintenanceController = (req: Request, res: Response) => action(req, res, 'COMPLETED', 'complete');
export const cancelMaintenanceController = (req: Request, res: Response) => action(req, res, 'CANCELLED', 'cancel');
