import { Request, Response } from 'express';
import { sendSuccess } from '../../utils/response';
import { createAuditLog } from '../audit/audit.service';
import { getActorContext, type ActorContext } from '../access/actor-context.service';
import { getScopedWhereForResource, assertCanReadResource, assertCanUpdateResource } from '../access/scoped-enforcement.service';
import { isGlobalUser } from '../access/access-policy.service';
import type { ResourceType } from '../access/resource-scope-map';
import { AppError } from '../../utils/appError';
import { prisma } from '../../lib/prisma';
import {
  listFuelSubmissions, getFuelSubmission,
  listExpenseSubmissions, getExpenseSubmission,
  listDocumentSubmissions, getDocumentSubmission,
  listIssueSubmissions, getIssueSubmission,
  listInspectionSubmissions, getInspectionSubmission,
} from './driver-submissions.service';

// Issue/Inspection records use VEHICLE scope type but their id is NOT the vehicle id.
// This helper checks the vehicleId field on the record directly.
async function assertCanUpdateByVehicleId(record: { vehicleId: string }, actor: any, _action: string) {
  if (isGlobalUser(actor)) return;
  if (actor.dataScopes.some((ds: any) => ds.scopeType === 'GLOBAL' && ds.accessLevel === 'MANAGE')) return;
  const allowed = actor.dataScopes.some((ds: any) => {
    if (ds.scopeType !== 'VEHICLE') return false;
    if (ds.scopeId !== null && ds.scopeId !== record.vehicleId) return false;
    return ds.accessLevel === 'UPDATE' || ds.accessLevel === 'MANAGE';
  });
  if (!allowed) {
    throw new AppError(`Access denied: insufficient data scope (need UPDATE on VEHICLE ${record.vehicleId})`, 403);
  }
}

// ─── Scoped list helper for child records (vehicleIssue, vehicleInspection) ──────
// getScopedWhereForResource(actor, 'VEHICLE') maps vehicleId→id (since Vehicle.id IS the vehicle).
// When used in vehicleIssue/vehicleInspection queries, this incorrectly filters by issue/inspection id.
// This helper correctly builds conditions for child records that have vehicleId/driverId columns.

type DataScopeEntry = { scopeType: string; scopeId: string | null; accessLevel: string };

function scopeCanRead(ds: DataScopeEntry): boolean {
  return ds.accessLevel === 'VIEW' || ds.accessLevel === 'UPDATE' || ds.accessLevel === 'MANAGE';
}

function getVehicleScopedWhereForChildRecord(actor: ActorContext): Record<string, unknown> | undefined {
  if (actor.isGlobalUser) return undefined;
  if (actor.dataScopes.some((ds: DataScopeEntry) => ds.scopeType === 'GLOBAL' && ds.accessLevel === 'MANAGE')) return undefined;

  const conditions: Record<string, unknown>[] = [];

  // VEHICLE scopes: filter by vehicleId
  const vehicleNullScope = actor.dataScopes.some(
    (ds: DataScopeEntry) => ds.scopeType === 'VEHICLE' && ds.scopeId === null && scopeCanRead(ds),
  );
  if (!vehicleNullScope) {
    const vehicleScopeIds = actor.dataScopes
      .filter((ds: DataScopeEntry) => ds.scopeType === 'VEHICLE' && ds.scopeId !== null && scopeCanRead(ds))
      .map((ds: DataScopeEntry) => ds.scopeId!);
    if (vehicleScopeIds.length > 0) {
      conditions.push({ vehicleId: { in: vehicleScopeIds } });
    }
  }
  // If vehicleNullScope is true, all vehicles are visible — no vehicleId filter needed.

  // DRIVER scopes: filter by driverId
  const driverNullScope = actor.dataScopes.some(
    (ds: DataScopeEntry) => ds.scopeType === 'DRIVER' && ds.scopeId === null && scopeCanRead(ds),
  );
  if (!driverNullScope) {
    const driverScopeIds = actor.dataScopes
      .filter((ds: DataScopeEntry) => ds.scopeType === 'DRIVER' && ds.scopeId !== null && scopeCanRead(ds))
      .map((ds: DataScopeEntry) => ds.scopeId!);
    if (driverScopeIds.length > 0) {
      conditions.push({ driverId: { in: driverScopeIds } });
    }
  }
  // If driverNullScope is true, all drivers are visible — no driverId filter needed.

  // If both null-scope checks passed, actor sees everything
  if (vehicleNullScope && driverNullScope) return undefined;

  // If either null-scope check passed, that dimension is unfiltered
  if (vehicleNullScope || driverNullScope) {
    if (conditions.length === 0) return undefined;
    return conditions.length === 1 ? conditions[0] : { OR: conditions };
  }

  // Neither null-scope: if we have conditions, OR them; otherwise deny all
  if (conditions.length === 0) return { id: '__NO_ACCESS__' };
  if (conditions.length === 1) return conditions[0];
  return { OR: conditions };
}

// ─── Self-review guard ───────────────────────────────────────────────
// Blocks a reviewer from approving/rejecting their own driver submissions,
// even if permissions are misconfigured.

async function assertNotOwnDriverSubmission(actorUserId: string, record: any): Promise<void> {
  if (record.createdById === actorUserId) {
    throw new AppError('Cannot review your own driver submission', 403);
  }
  if (record.uploadedById === actorUserId) {
    throw new AppError('Cannot review your own driver submission', 403);
  }
  const driverId = record.driverId;
  if (driverId) {
    const link = await prisma.userProfileLink.findFirst({
      where: { userId: actorUserId, profileType: 'DRIVER', profileId: driverId, status: 'ACTIVE' },
    });
    if (link) {
      throw new AppError('Cannot review your own driver submission', 403);
    }
  }
}

// ─── List endpoints ────────────────────────────────────────────

function listOpts(req: Request) {
  return {
    page: Number(req.query.page) || 1,
    limit: Number(req.query.limit) || 20,
    status: req.query.status as string | undefined,
    driverId: req.query.driverId as string | undefined,
    vehicleId: req.query.vehicleId as string | undefined,
    dateFrom: req.query.dateFrom as string | undefined,
    dateTo: req.query.dateTo as string | undefined,
  };
}

export async function listAllSubmissionsController(req: Request, res: Response) {
  const actor = await getActorContext(req.authUser!.id);
  const opts = listOpts(req);

  const childScopedWhere = getVehicleScopedWhereForChildRecord(actor);
  const [fuel, expenses, documents, issues, inspections] = await Promise.all([
    listFuelSubmissions({ ...opts, limit: 5, extraWhere: getScopedWhereForResource(actor, 'FUEL_ENTRY' as ResourceType) as Record<string, unknown> }),
    listExpenseSubmissions({ ...opts, limit: 5, extraWhere: getScopedWhereForResource(actor, 'EXPENSE' as ResourceType) as Record<string, unknown> }),
    listDocumentSubmissions({ ...opts, limit: 5, extraWhere: getScopedWhereForResource(actor, 'DOCUMENT' as ResourceType) as Record<string, unknown> }),
    listIssueSubmissions({ ...opts, limit: 5, extraWhere: childScopedWhere as Record<string, unknown> }),
    listInspectionSubmissions({ ...opts, limit: 5, extraWhere: childScopedWhere as Record<string, unknown> }),
  ]);

  return sendSuccess(res, { fuel, expenses, documents, issues, inspections });
}

export async function listFuelSubmissionsController(req: Request, res: Response) {
  const actor = await getActorContext(req.authUser!.id);
  const scopedWhere = getScopedWhereForResource(actor, 'FUEL_ENTRY' as ResourceType);
  const result = await listFuelSubmissions({ ...listOpts(req), extraWhere: scopedWhere as Record<string, unknown> });
  return sendSuccess(res, result);
}

export async function listExpenseSubmissionsController(req: Request, res: Response) {
  const actor = await getActorContext(req.authUser!.id);
  const scopedWhere = getScopedWhereForResource(actor, 'EXPENSE' as ResourceType);
  const result = await listExpenseSubmissions({ ...listOpts(req), extraWhere: scopedWhere as Record<string, unknown> });
  return sendSuccess(res, result);
}

export async function listDocumentSubmissionsController(req: Request, res: Response) {
  const actor = await getActorContext(req.authUser!.id);
  const scopedWhere = getScopedWhereForResource(actor, 'DOCUMENT' as ResourceType);
  const result = await listDocumentSubmissions({ ...listOpts(req), extraWhere: scopedWhere as Record<string, unknown> });
  return sendSuccess(res, result);
}

export async function listIssueSubmissionsController(req: Request, res: Response) {
  const actor = await getActorContext(req.authUser!.id);
  const scopedWhere = getVehicleScopedWhereForChildRecord(actor);
  const result = await listIssueSubmissions({ ...listOpts(req), extraWhere: scopedWhere as Record<string, unknown> });
  return sendSuccess(res, result);
}

export async function listInspectionSubmissionsController(req: Request, res: Response) {
  const actor = await getActorContext(req.authUser!.id);
  const scopedWhere = getVehicleScopedWhereForChildRecord(actor);
  const result = await listInspectionSubmissions({ ...listOpts(req), extraWhere: scopedWhere as Record<string, unknown> });
  return sendSuccess(res, result);
}

// ─── Fuel review actions ───────────────────────────────────────

function auditMeta(req: Request, oldStatus: string, newStatus: string, entityId: string, driverId: string, reason?: string) {
  return {
    reviewerId: req.authUser!.id,
    driverId,
    entityId,
    oldStatus,
    newStatus,
    ...(reason ? { reason } : {}),
  };
}

export async function approveFuelController(req: Request, res: Response) {
  const actor = await getActorContext(req.authUser!.id);
  const existing = await getFuelSubmission(String(req.params.id));
  assertCanUpdateResource(actor, 'FUEL_ENTRY' as ResourceType, existing as unknown as Record<string, unknown>);
  await assertNotOwnDriverSubmission(req.authUser!.id, existing);

  const item = await prisma.fuelEntry.update({
    where: { id: existing.id },
    data: {
      status: 'APPROVED',
      approvedById: req.authUser!.id,
      approvedAt: new Date(),
      reviewComments: req.body.reason || null,
    },
  });

  await createAuditLog(req, {
    userId: req.authUser!.id,
    action: 'driver_submission.fuel.approve',
    entityType: 'fuel',
    entityId: item.id,
    metadata: auditMeta(req, existing.status, 'APPROVED', item.id, existing.driverId || '', req.body.reason),
  });

  return sendSuccess(res, item, 'Fuel submission approved');
}

export async function rejectFuelController(req: Request, res: Response) {
  const actor = await getActorContext(req.authUser!.id);
  const existing = await getFuelSubmission(String(req.params.id));
  assertCanUpdateResource(actor, 'FUEL_ENTRY' as ResourceType, existing as unknown as Record<string, unknown>);
  await assertNotOwnDriverSubmission(req.authUser!.id, existing);

  const item = await prisma.fuelEntry.update({
    where: { id: existing.id },
    data: { status: 'REJECTED', reviewComments: req.body.reason || null },
  });

  await createAuditLog(req, {
    userId: req.authUser!.id,
    action: 'driver_submission.fuel.reject',
    entityType: 'fuel',
    entityId: item.id,
    metadata: auditMeta(req, existing.status, 'REJECTED', item.id, existing.driverId || '', req.body.reason),
  });

  return sendSuccess(res, item, 'Fuel submission rejected');
}

export async function requestChangesFuelController(req: Request, res: Response) {
  const actor = await getActorContext(req.authUser!.id);
  const existing = await getFuelSubmission(String(req.params.id));
  assertCanUpdateResource(actor, 'FUEL_ENTRY' as ResourceType, existing as unknown as Record<string, unknown>);
  await assertNotOwnDriverSubmission(req.authUser!.id, existing);

  const item = await prisma.fuelEntry.update({
    where: { id: existing.id },
    data: { status: 'NEEDS_CHANGES', reviewComments: req.body.reason || null },
  });

  await createAuditLog(req, {
    userId: req.authUser!.id,
    action: 'driver_submission.fuel.request_changes',
    entityType: 'fuel',
    entityId: item.id,
    metadata: auditMeta(req, existing.status, 'NEEDS_CHANGES', item.id, existing.driverId || '', req.body.reason),
  });

  return sendSuccess(res, item, 'Changes requested for fuel submission');
}

// ─── Expense review actions ────────────────────────────────────

export async function approveExpenseController(req: Request, res: Response) {
  const actor = await getActorContext(req.authUser!.id);
  const existing = await getExpenseSubmission(String(req.params.id));
  assertCanUpdateResource(actor, 'EXPENSE' as ResourceType, existing as unknown as Record<string, unknown>);
  await assertNotOwnDriverSubmission(req.authUser!.id, existing);

  const item = await prisma.expense.update({
    where: { id: existing.id },
    data: {
      status: 'APPROVED',
      approvedById: req.authUser!.id,
      approvedAt: new Date(),
      reviewComments: req.body.reason || null,
    },
  });

  await createAuditLog(req, {
    userId: req.authUser!.id,
    action: 'driver_submission.expense.approve',
    entityType: 'expense',
    entityId: item.id,
    metadata: auditMeta(req, existing.status, 'APPROVED', item.id, existing.driverId || '', req.body.reason),
  });

  return sendSuccess(res, item, 'Expense submission approved');
}

export async function rejectExpenseController(req: Request, res: Response) {
  const actor = await getActorContext(req.authUser!.id);
  const existing = await getExpenseSubmission(String(req.params.id));
  assertCanUpdateResource(actor, 'EXPENSE' as ResourceType, existing as unknown as Record<string, unknown>);
  await assertNotOwnDriverSubmission(req.authUser!.id, existing);

  const item = await prisma.expense.update({
    where: { id: existing.id },
    data: { status: 'REJECTED', reviewComments: req.body.reason || null },
  });

  await createAuditLog(req, {
    userId: req.authUser!.id,
    action: 'driver_submission.expense.reject',
    entityType: 'expense',
    entityId: item.id,
    metadata: auditMeta(req, existing.status, 'REJECTED', item.id, existing.driverId || '', req.body.reason),
  });

  return sendSuccess(res, item, 'Expense submission rejected');
}

export async function requestChangesExpenseController(req: Request, res: Response) {
  const actor = await getActorContext(req.authUser!.id);
  const existing = await getExpenseSubmission(String(req.params.id));
  assertCanUpdateResource(actor, 'EXPENSE' as ResourceType, existing as unknown as Record<string, unknown>);
  await assertNotOwnDriverSubmission(req.authUser!.id, existing);

  const item = await prisma.expense.update({
    where: { id: existing.id },
    data: { status: 'NEEDS_CHANGES', reviewComments: req.body.reason || null },
  });

  await createAuditLog(req, {
    userId: req.authUser!.id,
    action: 'driver_submission.expense.request_changes',
    entityType: 'expense',
    entityId: item.id,
    metadata: auditMeta(req, existing.status, 'NEEDS_CHANGES', item.id, existing.driverId || '', req.body.reason),
  });

  return sendSuccess(res, item, 'Changes requested for expense submission');
}

// ─── Document review actions ───────────────────────────────────

export async function verifyDocumentController(req: Request, res: Response) {
  const actor = await getActorContext(req.authUser!.id);
  const existing = await getDocumentSubmission(String(req.params.id));
  assertCanUpdateResource(actor, 'DOCUMENT' as ResourceType, existing as unknown as Record<string, unknown>);
  await assertNotOwnDriverSubmission(req.authUser!.id, existing);

  const item = await prisma.document.update({
    where: { id: existing.id },
    data: {
      verificationStatus: 'VERIFIED',
      verifiedById: req.authUser!.id,
      verifiedAt: new Date(),
      reviewComments: req.body.reason || null,
    },
  });

  await createAuditLog(req, {
    userId: req.authUser!.id,
    action: 'driver_submission.document.verify',
    entityType: 'document',
    entityId: item.id,
    metadata: auditMeta(req, existing.verificationStatus, 'VERIFIED', item.id, existing.driverId || '', req.body.reason),
  });

  return sendSuccess(res, item, 'Document verified');
}

export async function rejectDocumentController(req: Request, res: Response) {
  const actor = await getActorContext(req.authUser!.id);
  const existing = await getDocumentSubmission(String(req.params.id));
  assertCanUpdateResource(actor, 'DOCUMENT' as ResourceType, existing as unknown as Record<string, unknown>);
  await assertNotOwnDriverSubmission(req.authUser!.id, existing);

  const item = await prisma.document.update({
    where: { id: existing.id },
    data: { verificationStatus: 'REJECTED', reviewComments: req.body.reason || null },
  });

  await createAuditLog(req, {
    userId: req.authUser!.id,
    action: 'driver_submission.document.reject',
    entityType: 'document',
    entityId: item.id,
    metadata: auditMeta(req, existing.verificationStatus, 'REJECTED', item.id, existing.driverId || '', req.body.reason),
  });

  return sendSuccess(res, item, 'Document rejected');
}

export async function requestChangesDocumentController(req: Request, res: Response) {
  const actor = await getActorContext(req.authUser!.id);
  const existing = await getDocumentSubmission(String(req.params.id));
  assertCanUpdateResource(actor, 'DOCUMENT' as ResourceType, existing as unknown as Record<string, unknown>);
  await assertNotOwnDriverSubmission(req.authUser!.id, existing);

  const item = await prisma.document.update({
    where: { id: existing.id },
    data: { verificationStatus: 'NEEDS_CHANGES', reviewComments: req.body.reason || null },
  });

  await createAuditLog(req, {
    userId: req.authUser!.id,
    action: 'driver_submission.document.request_changes',
    entityType: 'document',
    entityId: item.id,
    metadata: auditMeta(req, existing.verificationStatus, 'NEEDS_CHANGES', item.id, existing.driverId || '', req.body.reason),
  });

  return sendSuccess(res, item, 'Changes requested for document');
}

// ─── Vehicle issue review actions ──────────────────────────────

export async function acknowledgeIssueController(req: Request, res: Response) {
  const actor = await getActorContext(req.authUser!.id);
  const existing = await getIssueSubmission(String(req.params.id));
  await assertCanUpdateByVehicleId(existing as any, actor, 'UPDATE');
  await assertNotOwnDriverSubmission(req.authUser!.id, existing);

  const item = await prisma.vehicleIssue.update({
    where: { id: existing.id },
    data: {
      status: 'ACKNOWLEDGED',
      reviewedById: req.authUser!.id,
      reviewedAt: new Date(),
      reviewComments: req.body.reason || null,
    },
  });

  await createAuditLog(req, {
    userId: req.authUser!.id,
    action: 'driver_submission.issue.acknowledge',
    entityType: 'vehicleIssue',
    entityId: item.id,
    metadata: auditMeta(req, existing.status, 'ACKNOWLEDGED', item.id, existing.driverId, req.body.reason),
  });

  return sendSuccess(res, item, 'Vehicle issue acknowledged');
}

export async function resolveIssueController(req: Request, res: Response) {
  const actor = await getActorContext(req.authUser!.id);
  const existing = await getIssueSubmission(String(req.params.id));
  await assertCanUpdateByVehicleId(existing as any, actor, 'UPDATE');
  await assertNotOwnDriverSubmission(req.authUser!.id, existing);

  const item = await prisma.vehicleIssue.update({
    where: { id: existing.id },
    data: {
      status: 'RESOLVED',
      resolvedAt: new Date(),
      resolutionNotes: req.body.reason || null,
      reviewedById: req.authUser!.id,
      reviewedAt: new Date(),
    },
  });

  await createAuditLog(req, {
    userId: req.authUser!.id,
    action: 'driver_submission.issue.resolve',
    entityType: 'vehicleIssue',
    entityId: item.id,
    metadata: auditMeta(req, existing.status, 'RESOLVED', item.id, existing.driverId, req.body.reason),
  });

  return sendSuccess(res, item, 'Vehicle issue resolved');
}

export async function rejectIssueController(req: Request, res: Response) {
  const actor = await getActorContext(req.authUser!.id);
  const existing = await getIssueSubmission(String(req.params.id));
  await assertCanUpdateByVehicleId(existing as any, actor, 'UPDATE');
  await assertNotOwnDriverSubmission(req.authUser!.id, existing);

  const item = await prisma.vehicleIssue.update({
    where: { id: existing.id },
    data: {
      status: 'REJECTED',
      reviewedById: req.authUser!.id,
      reviewedAt: new Date(),
      reviewComments: req.body.reason || null,
    },
  });

  await createAuditLog(req, {
    userId: req.authUser!.id,
    action: 'driver_submission.issue.reject',
    entityType: 'vehicleIssue',
    entityId: item.id,
    metadata: auditMeta(req, existing.status, 'REJECTED', item.id, existing.driverId, req.body.reason),
  });

  return sendSuccess(res, item, 'Vehicle issue rejected');
}

// ─── Inspection review actions ─────────────────────────────────

export async function reviewInspectionController(req: Request, res: Response) {
  const actor = await getActorContext(req.authUser!.id);
  const existing = await getInspectionSubmission(String(req.params.id));
  await assertCanUpdateByVehicleId(existing as any, actor, 'UPDATE');
  await assertNotOwnDriverSubmission(req.authUser!.id, existing);

  const item = await prisma.vehicleInspection.update({
    where: { id: existing.id },
    data: {
      reviewStatus: 'REVIEWED',
      reviewedById: req.authUser!.id,
      reviewedAt: new Date(),
      reviewComments: req.body.reason || null,
    },
  });

  await createAuditLog(req, {
    userId: req.authUser!.id,
    action: 'driver_submission.inspection.review',
    entityType: 'vehicleInspection',
    entityId: item.id,
    metadata: auditMeta(req, existing.reviewStatus, 'REVIEWED', item.id, existing.driverId, req.body.reason),
  });

  return sendSuccess(res, item, 'Inspection reviewed');
}

export async function rejectInspectionController(req: Request, res: Response) {
  const actor = await getActorContext(req.authUser!.id);
  const existing = await getInspectionSubmission(String(req.params.id));
  await assertCanUpdateByVehicleId(existing as any, actor, 'UPDATE');
  await assertNotOwnDriverSubmission(req.authUser!.id, existing);

  const item = await prisma.vehicleInspection.update({
    where: { id: existing.id },
    data: {
      reviewStatus: 'REJECTED',
      reviewedById: req.authUser!.id,
      reviewedAt: new Date(),
      reviewComments: req.body.reason || null,
    },
  });

  await createAuditLog(req, {
    userId: req.authUser!.id,
    action: 'driver_submission.inspection.reject',
    entityType: 'vehicleInspection',
    entityId: item.id,
    metadata: auditMeta(req, existing.reviewStatus, 'REJECTED', item.id, existing.driverId, req.body.reason),
  });

  return sendSuccess(res, item, 'Inspection rejected');
}

export async function requestChangesInspectionController(req: Request, res: Response) {
  const actor = await getActorContext(req.authUser!.id);
  const existing = await getInspectionSubmission(String(req.params.id));
  await assertCanUpdateByVehicleId(existing as any, actor, 'UPDATE');
  await assertNotOwnDriverSubmission(req.authUser!.id, existing);

  const item = await prisma.vehicleInspection.update({
    where: { id: existing.id },
    data: {
      reviewStatus: 'NEEDS_CHANGES',
      reviewedById: req.authUser!.id,
      reviewedAt: new Date(),
      reviewComments: req.body.reason || null,
    },
  });

  await createAuditLog(req, {
    userId: req.authUser!.id,
    action: 'driver_submission.inspection.request_changes',
    entityType: 'vehicleInspection',
    entityId: item.id,
    metadata: auditMeta(req, existing.reviewStatus, 'NEEDS_CHANGES', item.id, existing.driverId, req.body.reason),
  });

  return sendSuccess(res, item, 'Changes requested for inspection');
}
