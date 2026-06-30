import { Request, Response } from 'express';
import { sendSuccess } from '../../utils/response';
import { createAuditLog } from '../audit/audit.service';
import { getActorContext } from '../access/actor-context.service';
import { getScopedWhereForResource, assertCanReadResource, assertCanCreateResource, assertCanUpdateResource, assertCanChangeResourceScope } from '../access/scoped-enforcement.service';
import type { ResourceType } from '../access/resource-scope-map';
import {
  createDriver,
  getDriverById,
  listDrivers,
  updateDriver,
  updateDriverStatus,
} from './drivers.service';

const RESOURCE: ResourceType = 'DRIVER';

export async function listDriversController(req: Request, res: Response) {
  const actor = await getActorContext(req.authUser!.id);
  const scopedWhere = getScopedWhereForResource(actor, RESOURCE);

  const result = await listDrivers({
    search: req.query.search as string | undefined,
    status: req.query.status as string | undefined,
    page: Number(req.query.page) || 1,
    limit: Number(req.query.limit) || 20,
    extraWhere: scopedWhere as Record<string, unknown> | undefined,
  });
  return sendSuccess(res, result);
}

export async function getDriverController(req: Request, res: Response) {
  const actor = await getActorContext(req.authUser!.id);
  const driver = await getDriverById(String(req.params.id));
  assertCanReadResource(actor, RESOURCE, driver as unknown as Record<string, unknown>);
  return sendSuccess(res, driver);
}

export async function createDriverController(req: Request, res: Response) {
  const actor = await getActorContext(req.authUser!.id);
  assertCanCreateResource(actor, RESOURCE, req.body);

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
  const actor = await getActorContext(req.authUser!.id);
  const existing = await getDriverById(String(req.params.id));
  assertCanUpdateResource(actor, RESOURCE, existing as unknown as Record<string, unknown>);
  assertCanChangeResourceScope(actor, RESOURCE, existing as unknown as Record<string, unknown>, req.body);

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
  const actor = await getActorContext(req.authUser!.id);
  const existing = await getDriverById(String(req.params.id));
  assertCanUpdateResource(actor, RESOURCE, existing as unknown as Record<string, unknown>);

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
