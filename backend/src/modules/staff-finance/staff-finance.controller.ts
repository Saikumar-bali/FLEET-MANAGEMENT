import { Request, Response } from 'express';
import { sendSuccess } from '../../utils/response';
import { createAuditLog } from '../audit/audit.service';
import * as service from './staff-finance.service';

function actor(req: Request) { return req.authUser!.id; }

export async function listWalletsController(req: Request, res: Response) { return sendSuccess(res, await service.listWallets(req.query as any)); }
export async function getWalletController(req: Request, res: Response) { return sendSuccess(res, await service.getWallet(String(req.params.userId), true)); }
export async function getOwnWalletController(req: Request, res: Response) { return sendSuccess(res, await service.getWallet(actor(req), true)); }
export async function listAdvancesController(req: Request, res: Response) { return sendSuccess(res, await service.listStaffAdvances(req.query as any)); }
export async function listOwnAdvancesController(req: Request, res: Response) { return sendSuccess(res, await service.listStaffAdvances({ ...(req.query as any), beneficiaryUserId: actor(req) })); }
export async function getAdvanceController(req: Request, res: Response) { return sendSuccess(res, await service.getStaffAdvance(String(req.params.id))); }
export async function createAdvanceController(req: Request, res: Response) {
  const item = await service.createStaffAdvance({ ...req.body, createdById: actor(req) });
  await createAuditLog(req, { userId: actor(req), action: 'staff_advance.create', entityType: 'staff_advance', entityId: item.id, metadata: { beneficiaryUserId: item.beneficiaryUserId, targetAllowance: item.targetAllowance } });
  return sendSuccess(res, item, 'Staff advance created', 201);
}
export async function submitAdvanceController(req: Request, res: Response) { return sendSuccess(res, await service.submitStaffAdvance(String(req.params.id), actor(req)), 'Advance submitted'); }
export async function approveAdvanceController(req: Request, res: Response) { return sendSuccess(res, await service.approveStaffAdvance(String(req.params.id), actor(req)), 'Advance approved'); }
export async function rejectAdvanceController(req: Request, res: Response) { return sendSuccess(res, await service.rejectStaffAdvance(String(req.params.id), actor(req), req.body.reason ?? req.body.notes ?? 'Rejected', false), 'Advance rejected'); }
export async function requestAdvanceChangesController(req: Request, res: Response) { return sendSuccess(res, await service.rejectStaffAdvance(String(req.params.id), actor(req), req.body.reason ?? req.body.notes ?? 'Changes requested', true), 'Advance returned for changes'); }
export async function fundAdvanceController(req: Request, res: Response) {
  const item = await service.fundStaffAdvance(String(req.params.id), actor(req), req.body);
  await createAuditLog(req, { userId: actor(req), action: 'staff_advance.fund', entityType: 'staff_advance', entityId: item.id, metadata: { newCashIssued: item.newCashIssued, existingBalanceAllocated: item.existingBalanceAllocated } });
  return sendSuccess(res, item, 'Advance funded and allocated');
}
export async function cancelAdvanceController(req: Request, res: Response) { return sendSuccess(res, await service.cancelStaffAdvance(String(req.params.id), actor(req), req.body.reason), 'Advance cancelled with reversal'); }

export async function listSettlementsController(req: Request, res: Response) { return sendSuccess(res, await service.listStaffSettlements(req.query as any)); }
export async function listOwnSettlementsController(req: Request, res: Response) { return sendSuccess(res, await service.listStaffSettlements({ ...(req.query as any), beneficiaryUserId: actor(req) })); }
export async function createSettlementController(req: Request, res: Response) {
  const ownOnly = !req.authPermissions?.includes('staff_settlement_manage');
  return sendSuccess(res, await service.createStaffSettlement({ ...req.body, createdById: actor(req) }, ownOnly), 'Settlement created', 201);
}
export async function submitSettlementController(req: Request, res: Response) { return sendSuccess(res, await service.submitStaffSettlement(String(req.params.id), actor(req)), 'Settlement submitted'); }
export async function approveSettlementController(req: Request, res: Response) { return sendSuccess(res, await service.approveStaffSettlement(String(req.params.id), actor(req)), 'Settlement approved'); }
export async function cancelSettlementController(req: Request, res: Response) {
  const ownOnly = !req.authPermissions?.includes('staff_settlement_manage');
  return sendSuccess(res, await service.cancelStaffSettlement(String(req.params.id), actor(req), req.body.reason, ownOnly), 'Settlement cancelled and source lines released');
}
export async function confirmSettlementController(req: Request, res: Response) {
  const item = await service.confirmStaffSettlement(String(req.params.id), actor(req), req.body);
  await createAuditLog(req, { userId: actor(req), action: 'staff_settlement.confirm', entityType: 'staff_settlement', entityId: item.id });
  return sendSuccess(res, item, 'Settlement closed');
}

export async function listPoliciesController(_req: Request, res: Response) { return sendSuccess(res, await service.listAllowancePolicies()); }
export async function createPolicyController(req: Request, res: Response) { return sendSuccess(res, await service.createAllowancePolicy(req.body), 'Allowance policy created', 201); }
export async function updatePolicyController(req: Request, res: Response) { return sendSuccess(res, await service.updateAllowancePolicy(String(req.params.id), req.body), 'Allowance policy updated'); }
