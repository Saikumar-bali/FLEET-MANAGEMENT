import { Request, Response } from 'express';
import { sendSuccess } from '../../utils/response';
import { createAuditLog } from '../audit/audit.service';
import * as s from './repairs.service';

export async function listRepairsController(req: Request, res: Response) {
  return sendSuccess(res, await s.listRepairs({ ...req.query, page: Number(req.query.page) || 1, limit: Number(req.query.limit) || 20 }));
}

export async function getRepairController(req: Request, res: Response) {
  return sendSuccess(res, await s.getRepair(String(req.params.id)));
}

export async function createRepairController(req: Request, res: Response) {
  const item = await s.createRepair({ ...req.body, createdById: req.authUser?.id });
  await createAuditLog(req, { userId: req.authUser?.id, action: 'repair.create', entityType: 'repair', entityId: item.id });
  return sendSuccess(res, item, 'Repair created successfully', 201);
}

export async function updateRepairController(req: Request, res: Response) {
  const item = await s.updateRepair(String(req.params.id), req.body);
  await createAuditLog(req, { userId: req.authUser?.id, action: 'repair.update', entityType: 'repair', entityId: item.id });
  return sendSuccess(res, item, 'Repair updated successfully');
}

async function action(req: Request, res: Response, status: any, actionName: string) {
  const item = await s.transitionRepair(String(req.params.id), status, req.authUser?.id, req.body.notes);
  const metadata = req.body.notes ? { notes: req.body.notes } : undefined;
  await createAuditLog(req, { userId: req.authUser?.id, action: `repair.${actionName}`, entityType: 'repair', entityId: item.id, metadata });
  return sendSuccess(res, item, `Repair ${actionName}ed successfully`);
}

export const scheduleRepairController = (req: Request, res: Response) => action(req, res, 'SCHEDULED', 'schedule');
export const startRepairController = (req: Request, res: Response) => action(req, res, 'IN_PROGRESS', 'start');
export const completeRepairController = (req: Request, res: Response) => action(req, res, 'COMPLETED', 'complete');
export const cancelRepairController = (req: Request, res: Response) => action(req, res, 'CANCELLED', 'cancel');
