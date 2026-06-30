import { Request, Response } from 'express';
import { sendSuccess } from '../../utils/response';
import { createAuditLog } from '../audit/audit.service';
import { getActorContext } from '../access/actor-context.service';
import { getScopedWhereForResource, assertCanReadResource, assertCanCreateResource, assertCanUpdateResource, assertCanChangeResourceScope } from '../access/scoped-enforcement.service';
import type { ResourceType } from '../access/resource-scope-map';
import { createMaintenance, getMaintenance, listMaintenance, transitionMaintenance, updateMaintenance } from './maintenance.service';

const RESOURCE: ResourceType = 'MAINTENANCE';

export async function listMaintenanceController(req: Request, res: Response) {
  const actor = await getActorContext(req.authUser!.id);
  const scopedWhere = getScopedWhereForResource(actor, RESOURCE);

  const result = await listMaintenance({
    ...req.query,
    page: Number(req.query.page) || 1,
    limit: Number(req.query.limit) || 20,
    extraWhere: scopedWhere as Record<string, unknown> | undefined,
  });
  return sendSuccess(res, result);
}

export async function getMaintenanceController(req: Request, res: Response) {
  const actor = await getActorContext(req.authUser!.id);
  const item = await getMaintenance(String(req.params.id));
  assertCanReadResource(actor, RESOURCE, item as unknown as Record<string, unknown>);
  return sendSuccess(res, item);
}

export async function createMaintenanceController(req: Request, res: Response) {
  const actor = await getActorContext(req.authUser!.id);
  assertCanCreateResource(actor, RESOURCE, req.body);

  const item = await createMaintenance({ ...req.body, createdById: req.authUser?.id });
  await createAuditLog(req, { userId: req.authUser?.id, action: 'maintenance.create', entityType: 'maintenance', entityId: item.id });
  return sendSuccess(res, item, 'Maintenance request created successfully', 201);
}

export async function updateMaintenanceController(req: Request, res: Response) {
  const actor = await getActorContext(req.authUser!.id);
  const existing = await getMaintenance(String(req.params.id));
  assertCanUpdateResource(actor, RESOURCE, existing as unknown as Record<string, unknown>);
  await assertCanChangeResourceScope(actor, RESOURCE, existing as unknown as Record<string, unknown>, req.body);

  const item = await updateMaintenance(String(req.params.id), req.body, req.authPermissions?.includes('maintenance_approve') ?? false);
  await createAuditLog(req, { userId: req.authUser?.id, action: 'maintenance.update', entityType: 'maintenance', entityId: item.id });
  return sendSuccess(res, item, 'Maintenance request updated successfully');
}

async function action(req: Request, res: Response, status: any, actionName: string) {
  const actor = await getActorContext(req.authUser!.id);
  const existing = await getMaintenance(String(req.params.id));
  assertCanUpdateResource(actor, RESOURCE, existing as unknown as Record<string, unknown>);

  const item = await transitionMaintenance(String(req.params.id), status, req.authUser?.id, req.body.notes);
  await createAuditLog(req, { userId: req.authUser?.id, action: `maintenance.${actionName}`, entityType: 'maintenance', entityId: item.id });
  return sendSuccess(res, item, `Maintenance request ${actionName}ed successfully`);
}

export const submitMaintenanceController = (req: Request, res: Response) => action(req, res, 'SUBMITTED', 'submit');
export const approveMaintenanceController = (req: Request, res: Response) => action(req, res, 'APPROVED', 'approve');
export const rejectMaintenanceController = (req: Request, res: Response) => action(req, res, 'REJECTED', 'reject');
export const cancelMaintenanceController = (req: Request, res: Response) => action(req, res, 'CANCELLED', 'cancel');
