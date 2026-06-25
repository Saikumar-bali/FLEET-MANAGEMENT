import { Request, Response } from 'express';
import { sendSuccess } from '../../utils/response';
import { createAuditLog } from '../audit/audit.service';
import { createFuel, getFuel, listFuel, transitionFuel, updateFuel } from './fuel.service';
import { extractFromReceipt } from './fuel-receipt-extraction.service';

export async function listFuelController(req: Request, res: Response) {
  return sendSuccess(res, await listFuel({ ...req.query, page: Number(req.query.page) || 1, limit: Number(req.query.limit) || 20 }));
}
export async function getFuelController(req: Request, res: Response) { return sendSuccess(res, await getFuel(String(req.params.id))); }
export async function createFuelController(req: Request, res: Response) {
  const item = await createFuel({ ...req.body, createdById: req.authUser?.id });
  await createAuditLog(req, { userId: req.authUser?.id, action: 'fuel.create', entityType: 'fuel', entityId: item.id });
  return sendSuccess(res, item, 'Fuel entry created successfully', 201);
}
export async function updateFuelController(req: Request, res: Response) {
  const item = await updateFuel(String(req.params.id), req.body, req.authPermissions?.includes('fuel_approve') ?? false);
  await createAuditLog(req, { userId: req.authUser?.id, action: 'fuel.update', entityType: 'fuel', entityId: item.id });
  return sendSuccess(res, item, 'Fuel entry updated successfully');
}
async function action(req: Request, res: Response, status: any, actionName: string) {
  const item = await transitionFuel(String(req.params.id), status, req.authUser?.id, req.body.notes);
  await createAuditLog(req, { userId: req.authUser?.id, action: `fuel.${actionName}`, entityType: 'fuel', entityId: item.id });
  return sendSuccess(res, item, `Fuel entry ${actionName}ed successfully`);
}
export const submitFuelController = (req: Request, res: Response) => action(req, res, 'SUBMITTED', 'submit');
export const approveFuelController = (req: Request, res: Response) => action(req, res, 'APPROVED', 'approve');
export const rejectFuelController = (req: Request, res: Response) => action(req, res, 'REJECTED', 'reject');
export const cancelFuelController = (req: Request, res: Response) => action(req, res, 'CANCELLED', 'cancel');

export async function extractReceiptController(req: Request, res: Response) {
  const { storageKey, mimeType } = req.body;
  if (!storageKey || !mimeType) {
    return sendSuccess(res, { error: 'storageKey and mimeType are required' }, 'Missing parameters', 400);
  }
  const result = await extractFromReceipt(storageKey, mimeType);
  return sendSuccess(res, result, 'Extraction completed');
}
