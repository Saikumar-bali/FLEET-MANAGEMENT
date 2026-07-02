import { Request, Response } from 'express';
import { sendSuccess } from '../../utils/response';
import { createAuditLog } from '../audit/audit.service';
import { getActorContext } from '../access/actor-context.service';
import { getScopedWhereForResource, assertCanReadResource, assertCanCreateResource, assertCanUpdateResource, assertCanChangeResourceScope } from '../access/scoped-enforcement.service';
import type { ResourceType } from '../access/resource-scope-map';
import { createFuel, getFuel, listFuel, transitionFuel, updateFuel } from './fuel.service';
import { extractFromReceipt } from './fuel-receipt-extraction.service';

const RESOURCE: ResourceType = 'FUEL_ENTRY';

export async function listFuelController(req: Request, res: Response) {
  const actor = await getActorContext(req.authUser!.id);
  const scopedWhere = getScopedWhereForResource(actor, RESOURCE);

  const result = await listFuel({
    ...req.query,
    page: Number(req.query.page) || 1,
    limit: Number(req.query.limit) || 20,
    extraWhere: scopedWhere as Record<string, unknown> | undefined,
  });
  return sendSuccess(res, result);
}

export async function getFuelController(req: Request, res: Response) {
  const actor = await getActorContext(req.authUser!.id);
  const item = await getFuel(String(req.params.id));
  assertCanReadResource(actor, RESOURCE, item as unknown as Record<string, unknown>);
  return sendSuccess(res, item);
}

export async function createFuelController(req: Request, res: Response) {
  const actor = await getActorContext(req.authUser!.id);
  assertCanCreateResource(actor, RESOURCE, req.body);

  const item = await createFuel({ ...req.body, createdById: req.authUser?.id });
  await createAuditLog(req, { userId: req.authUser?.id, action: 'fuel.create', entityType: 'fuel', entityId: item.id });
  return sendSuccess(res, item, 'Fuel entry created successfully', 201);
}

export async function updateFuelController(req: Request, res: Response) {
  const actor = await getActorContext(req.authUser!.id);
  const existing = await getFuel(String(req.params.id));
  assertCanUpdateResource(actor, RESOURCE, existing as unknown as Record<string, unknown>);
  await assertCanChangeResourceScope(actor, RESOURCE, existing as unknown as Record<string, unknown>, req.body);

  const item = await updateFuel(String(req.params.id), req.body, req.authPermissions?.includes('fuel_approve') ?? false);
  await createAuditLog(req, { userId: req.authUser?.id, action: 'fuel.update', entityType: 'fuel', entityId: item.id });
  return sendSuccess(res, item, 'Fuel entry updated successfully');
}

async function action(req: Request, res: Response, status: any, actionName: string) {
  const actor = await getActorContext(req.authUser!.id);
  const existing = await getFuel(String(req.params.id));
  assertCanUpdateResource(actor, RESOURCE, existing as unknown as Record<string, unknown>);

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
