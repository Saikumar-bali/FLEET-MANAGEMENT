import { Request, Response } from 'express';
import { sendSuccess } from '../../utils/response';
import { createAuditLog } from '../audit/audit.service';
import {
  addCashReturn,
  cancelDriverAdvance,
  cancelDriverSettlement,
  createDriverAdvance,
  createDriverSettlement,
  getDriverAdvance,
  getDriverSettlement,
  getOwnDriverId,
  issueDriverAdvance,
  listDriverAdvances,
  listDriverSettlements,
  settleDriverSettlement,
  submitDriverSettlement,
  updateDriverAdvance,
} from './driver-advances.service';
import {
  approveSettlementSafe,
  rejectSettlementSafe,
  requestSettlementChangesSafe,
  reviewSettlementSafe,
} from './driver-advances.transitions';

function userId(req: Request): string {
  return req.authUser!.id;
}

export async function listAdvancesController(req: Request, res: Response) {
  const result = await listDriverAdvances(req.query as any);
  return sendSuccess(res, result);
}

export async function getAdvanceController(req: Request, res: Response) {
  const result = await getDriverAdvance(String(req.params.id));
  return sendSuccess(res, result);
}

export async function createAdvanceController(req: Request, res: Response) {
  const item = await createDriverAdvance({ ...req.body, createdById: userId(req) });
  await createAuditLog(req, {
    userId: userId(req),
    action: 'driver_advance.create',
    entityType: 'driver_advance',
    entityId: item.id,
    metadata: { driverId: item.driverId, amount: item.amount },
  });
  return sendSuccess(res, item, 'Driver advance created', 201);
}

export async function updateAdvanceController(req: Request, res: Response) {
  const item = await updateDriverAdvance(String(req.params.id), req.body, userId(req));
  await createAuditLog(req, { userId: userId(req), action: 'driver_advance.update', entityType: 'driver_advance', entityId: item.id });
  return sendSuccess(res, item, 'Driver advance updated');
}

export async function issueAdvanceController(req: Request, res: Response) {
  const item = await issueDriverAdvance(String(req.params.id), { ...req.body, userId: userId(req) });
  await createAuditLog(req, {
    userId: userId(req),
    action: 'driver_advance.issue',
    entityType: 'driver_advance',
    entityId: item.id,
    metadata: { driverId: item.driverId, issuedAmount: item.issuedAmount },
  });
  return sendSuccess(res, item, 'Driver advance issued');
}

export async function cancelAdvanceController(req: Request, res: Response) {
  const item = await cancelDriverAdvance(String(req.params.id), req.body.reason, userId(req));
  await createAuditLog(req, { userId: userId(req), action: 'driver_advance.cancel', entityType: 'driver_advance', entityId: item.id, metadata: { reason: req.body.reason } });
  return sendSuccess(res, item, 'Driver advance cancelled');
}

export async function listAdvanceSettlementsController(req: Request, res: Response) {
  const result = await listDriverSettlements({ ...(req.query as any), advanceId: String(req.params.id) });
  return sendSuccess(res, result);
}

export async function createSettlementForAdvanceController(req: Request, res: Response) {
  const item = await createDriverSettlement(String(req.params.id), { ...req.body, createdById: userId(req) });
  await createAuditLog(req, { userId: userId(req), action: 'driver_settlement.create', entityType: 'driver_settlement', entityId: item.id, metadata: { advanceId: item.advanceId, driverId: item.driverId } });
  return sendSuccess(res, item, 'Driver settlement created', 201);
}

export async function listSettlementsController(req: Request, res: Response) {
  const result = await listDriverSettlements(req.query as any);
  return sendSuccess(res, result);
}

export async function getSettlementController(req: Request, res: Response) {
  const result = await getDriverSettlement(String(req.params.id));
  return sendSuccess(res, result);
}

export async function submitSettlementController(req: Request, res: Response) {
  const item = await submitDriverSettlement(String(req.params.id), userId(req));
  await createAuditLog(req, { userId: userId(req), action: 'driver_settlement.submit', entityType: 'driver_settlement', entityId: item.id });
  return sendSuccess(res, item, 'Driver settlement submitted');
}

export async function reviewSettlementController(req: Request, res: Response) {
  const item = await reviewSettlementSafe(String(req.params.id), userId(req), req.body.reason ?? req.body.notes);
  await createAuditLog(req, { userId: userId(req), action: 'driver_settlement.review', entityType: 'driver_settlement', entityId: item.id });
  return sendSuccess(res, item, 'Driver settlement moved to review');
}

export async function approveSettlementController(req: Request, res: Response) {
  const item = await approveSettlementSafe(String(req.params.id), userId(req), req.body.reason ?? req.body.notes);
  await createAuditLog(req, { userId: userId(req), action: 'driver_settlement.approve', entityType: 'driver_settlement', entityId: item.id });
  return sendSuccess(res, item, 'Driver settlement approved');
}

export async function settleSettlementController(req: Request, res: Response) {
  const item = await settleDriverSettlement(String(req.params.id), { ...req.body, userId: userId(req) });
  await createAuditLog(req, { userId: userId(req), action: 'driver_settlement.settle', entityType: 'driver_settlement', entityId: item.id, metadata: { advanceId: item.advanceId } });
  return sendSuccess(res, item, 'Driver settlement settled');
}

export async function rejectSettlementController(req: Request, res: Response) {
  const item = await rejectSettlementSafe(String(req.params.id), userId(req), req.body.reason ?? req.body.notes);
  await createAuditLog(req, { userId: userId(req), action: 'driver_settlement.reject', entityType: 'driver_settlement', entityId: item.id });
  return sendSuccess(res, item, 'Driver settlement rejected');
}

export async function requestChangesSettlementController(req: Request, res: Response) {
  const item = await requestSettlementChangesSafe(String(req.params.id), userId(req), req.body.reason ?? req.body.notes);
  await createAuditLog(req, { userId: userId(req), action: 'driver_settlement.request_changes', entityType: 'driver_settlement', entityId: item.id });
  return sendSuccess(res, item, 'Driver settlement returned for changes');
}

export async function cancelSettlementController(req: Request, res: Response) {
  const item = await cancelDriverSettlement(String(req.params.id), userId(req), req.body.reason ?? req.body.notes);
  await createAuditLog(req, { userId: userId(req), action: 'driver_settlement.cancel', entityType: 'driver_settlement', entityId: item.id });
  return sendSuccess(res, item, 'Driver settlement cancelled');
}

export async function getSettlementSummaryController(req: Request, res: Response) {
  const item = await getDriverSettlement(String(req.params.id));
  return sendSuccess(res, {
    settlementNumber: item.settlementNumber,
    advanceNumber: item.advanceNumber,
    advanceIssuedAmount: item.advanceIssuedAmount,
    approvedFuelTotal: item.approvedFuelTotal,
    approvedExpenseTotal: item.approvedExpenseTotal,
    returnedCashAmount: item.returnedCashAmount,
    totalApprovedSpend: item.totalApprovedSpend,
    settlementTotal: item.settlementTotal,
    balanceDueFromDriver: item.balanceDueFromDriver,
    reimbursementDueToDriver: item.reimbursementDueToDriver,
    status: item.status,
  });
}

export async function listMyAdvancesController(req: Request, res: Response) {
  const driverId = await getOwnDriverId(userId(req));
  const result = await listDriverAdvances(req.query as any, driverId);
  return sendSuccess(res, result);
}

export async function getMyAdvanceController(req: Request, res: Response) {
  const driverId = await getOwnDriverId(userId(req));
  const result = await getDriverAdvance(String(req.params.id), driverId);
  return sendSuccess(res, result);
}

export async function listMySettlementsController(req: Request, res: Response) {
  const driverId = await getOwnDriverId(userId(req));
  const result = await listDriverSettlements(req.query as any, driverId);
  return sendSuccess(res, result);
}

export async function getMySettlementController(req: Request, res: Response) {
  const driverId = await getOwnDriverId(userId(req));
  const result = await getDriverSettlement(String(req.params.id), driverId);
  return sendSuccess(res, result);
}

export async function createMySettlementController(req: Request, res: Response) {
  const driverId = await getOwnDriverId(userId(req));
  const item = await createDriverSettlement(String(req.params.id), { ...req.body, createdById: userId(req), actorDriverId: driverId });
  await createAuditLog(req, { userId: userId(req), action: 'driver_settlement.submit_own.create', entityType: 'driver_settlement', entityId: item.id, metadata: { driverId } });
  return sendSuccess(res, item, 'Driver settlement created', 201);
}

export async function submitMySettlementController(req: Request, res: Response) {
  const driverId = await getOwnDriverId(userId(req));
  const item = await submitDriverSettlement(String(req.params.id), userId(req), driverId);
  await createAuditLog(req, { userId: userId(req), action: 'driver_settlement.submit_own', entityType: 'driver_settlement', entityId: item.id, metadata: { driverId } });
  return sendSuccess(res, item, 'Driver settlement submitted');
}

export async function addMyCashReturnController(req: Request, res: Response) {
  const driverId = await getOwnDriverId(userId(req));
  const item = await addCashReturn(String(req.params.id), req.body.amount, userId(req), driverId, req.body.notes);
  await createAuditLog(req, { userId: userId(req), action: 'driver_settlement.cash_return', entityType: 'driver_settlement', entityId: item.id, metadata: { driverId, amount: req.body.amount } });
  return sendSuccess(res, item, 'Cash return added');
}
