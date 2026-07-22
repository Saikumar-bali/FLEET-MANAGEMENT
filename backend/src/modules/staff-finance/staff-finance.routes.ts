import { Router } from 'express';
import { authMiddleware } from '../../middlewares/authMiddleware';
import { requireAnyPermission } from '../../middlewares/permissions';
import { validateRequest } from '../../middlewares/validate';
import { asyncHandler } from '../../utils/asyncHandler';
import * as controller from './staff-finance.controller';
import * as schema from './staff-finance.validators';

const router = Router();
router.use(asyncHandler(authMiddleware));

router.get('/staff-wallets', requireAnyPermission(['staff_wallet_view']), validateRequest({ query: schema.staffFinanceListSchema }), asyncHandler(controller.listWalletsController));
router.get('/staff-wallets/:userId', requireAnyPermission(['staff_wallet_view']), validateRequest({ params: schema.walletUserParamsSchema }), asyncHandler(controller.getWalletController));
router.get('/me/wallet', requireAnyPermission(['staff_wallet_view_own', 'staff_wallet_view']), asyncHandler(controller.getOwnWalletController));

router.get('/staff-advances', requireAnyPermission(['staff_wallet_view', 'staff_advance_manage']), validateRequest({ query: schema.staffFinanceListSchema }), asyncHandler(controller.listAdvancesController));
router.get('/staff-advances/:id', requireAnyPermission(['staff_wallet_view', 'staff_advance_manage']), validateRequest({ params: schema.financeIdParamsSchema }), asyncHandler(controller.getAdvanceController));
router.post('/staff-advances', requireAnyPermission(['staff_advance_manage']), validateRequest({ body: schema.createStaffAdvanceSchema }), asyncHandler(controller.createAdvanceController));
router.patch('/staff-advances/:id/submit', requireAnyPermission(['staff_advance_manage']), validateRequest({ params: schema.financeIdParamsSchema, body: schema.transitionSchema }), asyncHandler(controller.submitAdvanceController));
router.patch('/staff-advances/:id/approve', requireAnyPermission(['staff_advance_approve']), validateRequest({ params: schema.financeIdParamsSchema, body: schema.transitionSchema }), asyncHandler(controller.approveAdvanceController));
router.patch('/staff-advances/:id/reject', requireAnyPermission(['staff_advance_approve']), validateRequest({ params: schema.financeIdParamsSchema, body: schema.transitionSchema }), asyncHandler(controller.rejectAdvanceController));
router.patch('/staff-advances/:id/request-changes', requireAnyPermission(['staff_advance_approve']), validateRequest({ params: schema.financeIdParamsSchema, body: schema.transitionSchema }), asyncHandler(controller.requestAdvanceChangesController));
router.patch('/staff-advances/:id/fund', requireAnyPermission(['staff_advance_fund']), validateRequest({ params: schema.financeIdParamsSchema, body: schema.fundStaffAdvanceSchema }), asyncHandler(controller.fundAdvanceController));
router.patch('/staff-advances/:id/cancel', requireAnyPermission(['staff_advance_manage']), validateRequest({ params: schema.financeIdParamsSchema, body: schema.cancelStaffAdvanceSchema }), asyncHandler(controller.cancelAdvanceController));
router.get('/me/advances', requireAnyPermission(['staff_wallet_view_own', 'staff_wallet_view']), validateRequest({ query: schema.staffFinanceListSchema }), asyncHandler(controller.listOwnAdvancesController));

router.get('/staff-settlements', requireAnyPermission(['staff_wallet_view', 'staff_settlement_manage']), validateRequest({ query: schema.staffFinanceListSchema }), asyncHandler(controller.listSettlementsController));
router.post('/staff-settlements', requireAnyPermission(['staff_settlement_manage', 'staff_wallet_view_own']), validateRequest({ body: schema.createStaffSettlementSchema }), asyncHandler(controller.createSettlementController));
router.patch('/staff-settlements/:id/submit', requireAnyPermission(['staff_settlement_manage', 'staff_wallet_view_own']), validateRequest({ params: schema.financeIdParamsSchema, body: schema.transitionSchema }), asyncHandler(controller.submitSettlementController));
router.patch('/staff-settlements/:id/approve', requireAnyPermission(['staff_settlement_approve']), validateRequest({ params: schema.financeIdParamsSchema, body: schema.transitionSchema }), asyncHandler(controller.approveSettlementController));
router.patch('/staff-settlements/:id/cancel', requireAnyPermission(['staff_settlement_manage', 'staff_wallet_view_own']), validateRequest({ params: schema.financeIdParamsSchema, body: schema.cancelStaffAdvanceSchema }), asyncHandler(controller.cancelSettlementController));
router.patch('/staff-settlements/:id/confirm', requireAnyPermission(['staff_settlement_cashier']), validateRequest({ params: schema.financeIdParamsSchema, body: schema.confirmStaffSettlementSchema }), asyncHandler(controller.confirmSettlementController));
router.get('/me/settlements', requireAnyPermission(['staff_wallet_view_own', 'staff_wallet_view']), validateRequest({ query: schema.staffFinanceListSchema }), asyncHandler(controller.listOwnSettlementsController));

router.get('/allowance-policies', requireAnyPermission(['staff_wallet_view', 'allowance_policy_manage']), asyncHandler(controller.listPoliciesController));
router.post('/allowance-policies', requireAnyPermission(['allowance_policy_manage']), validateRequest({ body: schema.allowancePolicySchema }), asyncHandler(controller.createPolicyController));
router.patch('/allowance-policies/:id', requireAnyPermission(['allowance_policy_manage']), validateRequest({ params: schema.financeIdParamsSchema, body: schema.updateAllowancePolicySchema }), asyncHandler(controller.updatePolicyController));

export default router;
