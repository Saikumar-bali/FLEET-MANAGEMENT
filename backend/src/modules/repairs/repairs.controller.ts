import { Request, Response } from 'express';
import { sendSuccess } from '../../utils/response';
import { createAuditLog } from '../audit/audit.service';

import { getScopedWhereForResource, assertCanReadResource, assertCanCreateResource, assertCanUpdateResource, assertCanChangeResourceScope } from '../access/scoped-enforcement.service';
import type { ResourceType } from '../access/resource-scope-map';
import { createNotification } from '../notifications/notifications.service';
import { createRepair, getRepair, listRepairs, transitionRepair, updateRepair } from './repairs.service';

const RESOURCE: ResourceType = 'REPAIR';

async function notifyAssignedMechanic(repair: any, actorId?: string | null) {
  if (!repair.assignedToId || repair.assignedToId === actorId) return;
  await createNotification({
    title: 'Repair assigned',
    message: `Repair for ${repair.vehicle?.vehicleNumber ?? 'vehicle'} has been assigned to you.`,
    category: 'REPAIR',
    severity: 'INFO',
    actionUrl: `/repairs/${repair.id}`,
    recipientPolicy: { type: 'USER', userIds: [repair.assignedToId] },
    createdById: actorId ?? null,
  });
}

async function notifyOps(title: string, message: string, repair: any, actorId?: string | null) {
  await createNotification({
    title,
    message,
    category: 'REPAIR',
    severity: 'INFO',
    actionUrl: `/repairs/${repair.id}`,
    recipientPolicy: { type: 'GLOBAL', includeRoles: ['super_admin', 'admin', 'manager', 'supervisor'] },
    createdById: actorId ?? null,
  });
}

export async function listRepairsController(req: Request, res: Response) {
  const actor = req.authActorContext!;
  const scopedWhere = getScopedWhereForResource(actor, RESOURCE);

  const result = await listRepairs(
    {
      ...req.query,
      page: Number(req.query.page) || 1,
      limit: Number(req.query.limit) || 20,
    },
    scopedWhere as Record<string, unknown> | undefined,
  );
  return sendSuccess(res, result);
}

export async function getRepairController(req: Request, res: Response) {
  const actor = req.authActorContext!;
  const item = await getRepair(String(req.params.id));
  assertCanReadResource(actor, RESOURCE, item as unknown as Record<string, unknown>);
  return sendSuccess(res, item);
}

export async function createRepairController(req: Request, res: Response) {
  const actor = req.authActorContext!;
  assertCanCreateResource(actor, RESOURCE, req.body);

  const item = await createRepair({ ...req.body, createdById: req.authUser?.id });
  await notifyAssignedMechanic(item, req.authUser?.id);
  await createAuditLog(req, { userId: req.authUser?.id, action: 'repair.create', entityType: 'repair', entityId: item.id });
  return sendSuccess(res, item, 'Repair created successfully', 201);
}

export async function updateRepairController(req: Request, res: Response) {
  const actor = req.authActorContext!;
  const existing = await getRepair(String(req.params.id));
  assertCanUpdateResource(actor, RESOURCE, existing as unknown as Record<string, unknown>);
  await assertCanChangeResourceScope(actor, RESOURCE, existing as unknown as Record<string, unknown>, req.body);

  const item = await updateRepair(String(req.params.id), req.body);
  if (item.assignedToId && item.assignedToId !== existing.assignedToId) {
    await notifyAssignedMechanic(item, req.authUser?.id);
  }
  await createAuditLog(req, { userId: req.authUser?.id, action: 'repair.update', entityType: 'repair', entityId: item.id });
  return sendSuccess(res, item, 'Repair updated successfully');
}

async function action(req: Request, res: Response, status: any, actionName: string) {
  const actor = req.authActorContext!;
  const existing = await getRepair(String(req.params.id));
  assertCanUpdateResource(actor, RESOURCE, existing as unknown as Record<string, unknown>);

  const item = await transitionRepair(String(req.params.id), status, req.authUser?.id, req.body.notes);
  if (!item) return sendSuccess(res, null, `Repair ${actionName}d successfully`);

  if (status === 'IN_PROGRESS') {
    await notifyOps('Repair started', `Repair for ${item.vehicle?.vehicleNumber ?? 'vehicle'} was started.`, item, req.authUser?.id);
  }
  if (status === 'COMPLETED') {
    await notifyOps('Repair completed', `Repair for ${item.vehicle?.vehicleNumber ?? 'vehicle'} was completed.`, item, req.authUser?.id);
  }
  if (status === 'CANCELLED') {
    await notifyOps('Repair cancelled', `Repair for ${item.vehicle?.vehicleNumber ?? 'vehicle'} was cancelled.`, item, req.authUser?.id);
  }

  await createAuditLog(req, { userId: req.authUser?.id, action: `repair.${actionName}`, entityType: 'repair', entityId: item.id });
  return sendSuccess(res, item, `Repair ${actionName}d successfully`);
}

export const startRepairController = (req: Request, res: Response) => action(req, res, 'IN_PROGRESS', 'start');
export const completeRepairController = (req: Request, res: Response) => action(req, res, 'COMPLETED', 'complete');
export const cancelRepairController = (req: Request, res: Response) => action(req, res, 'CANCELLED', 'cancel');
