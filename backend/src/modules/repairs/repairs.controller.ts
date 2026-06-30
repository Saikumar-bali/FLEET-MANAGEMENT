import { Request, Response } from 'express';
import { sendSuccess } from '../../utils/response';
import { createAuditLog } from '../audit/audit.service';
import { getActorContext } from '../access/actor-context.service';
import { getScopedWhereForResource, assertCanReadResource, assertCanCreateResource, assertCanUpdateResource, assertCanChangeResourceScope } from '../access/scoped-enforcement.service';
import type { ResourceType } from '../access/resource-scope-map';
import { createRepair, getRepair, listRepairs, transitionRepair, updateRepair } from './repairs.service';

const RESOURCE: ResourceType = 'REPAIR';

export async function listRepairsController(req: Request, res: Response) {
  const actor = await getActorContext(req.authUser!.id);
  const scopedWhere = getScopedWhereForResource(actor, RESOURCE);

  const result = await listRepairs({
    ...req.query,
    page: Number(req.query.page) || 1,
    limit: Number(req.query.limit) || 20,
    extraWhere: scopedWhere as Record<string, unknown> | undefined,
  });
  return sendSuccess(res, result);
}

export async function getRepairController(req: Request, res: Response) {
  const actor = await getActorContext(req.authUser!.id);
  const item = await getRepair(String(req.params.id));
  assertCanReadResource(actor, RESOURCE, item as unknown as Record<string, unknown>);
  return sendSuccess(res, item);
}

export async function createRepairController(req: Request, res: Response) {
  const actor = await getActorContext(req.authUser!.id);
  assertCanCreateResource(actor, RESOURCE, req.body);

  const item = await createRepair({ ...req.body, createdById: req.authUser?.id });
  await createAuditLog(req, { userId: req.authUser?.id, action: 'repair.create', entityType: 'repair', entityId: item.id });
  return sendSuccess(res, item, 'Repair created successfully', 201);
}

export async function updateRepairController(req: Request, res: Response) {
  const actor = await getActorContext(req.authUser!.id);
  const existing = await getRepair(String(req.params.id));
  assertCanUpdateResource(actor, RESOURCE, existing as unknown as Record<string, unknown>);
  assertCanChangeResourceScope(actor, RESOURCE, existing as unknown as Record<string, unknown>, req.body);

  const item = await updateRepair(String(req.params.id), req.body);
  await createAuditLog(req, { userId: req.authUser?.id, action: 'repair.update', entityType: 'repair', entityId: item.id });
  return sendSuccess(res, item, 'Repair updated successfully');
}

async function action(req: Request, res: Response, status: any, actionName: string) {
  const actor = await getActorContext(req.authUser!.id);
  const existing = await getRepair(String(req.params.id));
  assertCanUpdateResource(actor, RESOURCE, existing as unknown as Record<string, unknown>);

  const item = await transitionRepair(String(req.params.id), status, req.authUser?.id, req.body.notes);
  if (!item) return sendSuccess(res, null, `Repair ${actionName}d successfully`);
  await createAuditLog(req, { userId: req.authUser?.id, action: `repair.${actionName}`, entityType: 'repair', entityId: item.id });
  return sendSuccess(res, item, `Repair ${actionName}d successfully`);
}

export const startRepairController = (req: Request, res: Response) => action(req, res, 'IN_PROGRESS', 'start');
export const completeRepairController = (req: Request, res: Response) => action(req, res, 'COMPLETED', 'complete');
export const cancelRepairController = (req: Request, res: Response) => action(req, res, 'CANCELLED', 'cancel');
