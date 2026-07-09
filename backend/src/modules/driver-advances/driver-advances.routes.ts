import { Router } from 'express';
import { authMiddleware } from '../../middlewares/authMiddleware';
import { requireAnyPermission } from '../../middlewares/permissions';
import { validateRequest } from '../../middlewares/validate';
import { asyncHandler } from '../../utils/asyncHandler';
import {
  addMyCashReturnController,
  approveAdvanceController,
  approveSettlementController,
  cancelAdvanceController,
  cancelSettlementController,
  createAdvanceController,
  createMySettlementController,
  createSettlementForAdvanceController,
  getAdvanceController,
  getAdvanceReportController,
  getMyAdvanceController,
  getMySettlementController,
  getSettlementController,
  getSettlementSummaryController,
  issueAdvanceController,
  listAdvanceSettlementsController,
  listAdvancesController,
  listMyAdvancesController,
  listMySettlementsController,
  listSettlementsController,
  rejectAdvanceController,
  rejectSettlementController,
  requestChangesAdvanceController,
  requestChangesSettlementController,
  reviewSettlementController,
  settleSettlementController,
  submitAdvanceController,
  submitMySettlementController,
  submitSettlementController,
  updateAdvanceController,
} from './driver-advances.controller';
import {
  cashReturnSchema,
  cancelDriverAdvanceSchema,
  createDriverAdvanceSchema,
  createDriverSettlementSchema,
  driverAdvanceQuerySchema,
  driverAdvanceReportQuerySchema,
  driverSettlementQuerySchema,
  idParamsSchema,
  issueDriverAdvanceSchema,
  settleDriverSettlementSchema,
  transitionAdvanceSchema,
  transitionSettlementSchema,
  updateDriverAdvanceSchema,
} from './driver-advances.validators';

const router = Router();
router.use(asyncHandler(authMiddleware));

// Finance/Admin driver advance endpoints
router.get(
  '/driver-advances',
  requireAnyPermission(['driver_advance_view']),
  validateRequest({ query: driverAdvanceQuerySchema }),
  asyncHandler(listAdvancesController),
);

router.get(
  '/driver-advances/reports/summary',
  requireAnyPermission(['driver_advance_report', 'driver_advance_view']),
  validateRequest({ query: driverAdvanceReportQuerySchema }),
  asyncHandler(getAdvanceReportController),
);

router.post(
  '/driver-advances',
  requireAnyPermission(['driver_advance_create']),
  validateRequest({ body: createDriverAdvanceSchema }),
  asyncHandler(createAdvanceController),
);

router.get(
  '/driver-advances/:id',
  requireAnyPermission(['driver_advance_view']),
  validateRequest({ params: idParamsSchema }),
  asyncHandler(getAdvanceController),
);

router.patch(
  '/driver-advances/:id',
  requireAnyPermission(['driver_advance_update']),
  validateRequest({ params: idParamsSchema, body: updateDriverAdvanceSchema }),
  asyncHandler(updateAdvanceController),
);

router.patch(
  '/driver-advances/:id/submit',
  requireAnyPermission(['driver_advance_submit', 'driver_advance_create']),
  validateRequest({ params: idParamsSchema, body: transitionAdvanceSchema }),
  asyncHandler(submitAdvanceController),
);

router.patch(
  '/driver-advances/:id/approve',
  requireAnyPermission(['driver_advance_approve']),
  validateRequest({ params: idParamsSchema, body: transitionAdvanceSchema }),
  asyncHandler(approveAdvanceController),
);

router.patch(
  '/driver-advances/:id/reject',
  requireAnyPermission(['driver_advance_review', 'driver_advance_approve']),
  validateRequest({ params: idParamsSchema, body: transitionAdvanceSchema }),
  asyncHandler(rejectAdvanceController),
);

router.patch(
  '/driver-advances/:id/request-changes',
  requireAnyPermission(['driver_advance_review', 'driver_advance_approve']),
  validateRequest({ params: idParamsSchema, body: transitionAdvanceSchema }),
  asyncHandler(requestChangesAdvanceController),
);

router.patch(
  '/driver-advances/:id/issue',
  requireAnyPermission(['driver_advance_issue']),
  validateRequest({ params: idParamsSchema, body: issueDriverAdvanceSchema }),
  asyncHandler(issueAdvanceController),
);

router.patch(
  '/driver-advances/:id/cancel',
  requireAnyPermission(['driver_advance_cancel']),
  validateRequest({ params: idParamsSchema, body: cancelDriverAdvanceSchema }),
  asyncHandler(cancelAdvanceController),
);

router.get(
  '/driver-advances/:id/settlements',
  requireAnyPermission(['driver_settlement_view']),
  validateRequest({ params: idParamsSchema, query: driverSettlementQuerySchema }),
  asyncHandler(listAdvanceSettlementsController),
);

router.post(
  '/driver-advances/:id/settlements',
  requireAnyPermission(['driver_settlement_create']),
  validateRequest({ params: idParamsSchema, body: createDriverSettlementSchema }),
  asyncHandler(createSettlementForAdvanceController),
);

// Finance/Admin settlement endpoints
router.get(
  '/driver-settlements',
  requireAnyPermission(['driver_settlement_view']),
  validateRequest({ query: driverSettlementQuerySchema }),
  asyncHandler(listSettlementsController),
);

router.get(
  '/driver-settlements/:id',
  requireAnyPermission(['driver_settlement_view']),
  validateRequest({ params: idParamsSchema }),
  asyncHandler(getSettlementController),
);

router.get(
  '/driver-settlements/:id/summary',
  requireAnyPermission(['driver_settlement_view']),
  validateRequest({ params: idParamsSchema }),
  asyncHandler(getSettlementSummaryController),
);

router.patch(
  '/driver-settlements/:id/submit',
  requireAnyPermission(['driver_settlement_create', 'driver_settlement_review']),
  validateRequest({ params: idParamsSchema, body: transitionSettlementSchema }),
  asyncHandler(submitSettlementController),
);

router.patch(
  '/driver-settlements/:id/review',
  requireAnyPermission(['driver_settlement_review']),
  validateRequest({ params: idParamsSchema, body: transitionSettlementSchema }),
  asyncHandler(reviewSettlementController),
);

router.patch(
  '/driver-settlements/:id/approve',
  requireAnyPermission(['driver_settlement_approve']),
  validateRequest({ params: idParamsSchema, body: transitionSettlementSchema }),
  asyncHandler(approveSettlementController),
);

router.patch(
  '/driver-settlements/:id/settle',
  requireAnyPermission(['driver_settlement_settle']),
  validateRequest({ params: idParamsSchema, body: settleDriverSettlementSchema }),
  asyncHandler(settleSettlementController),
);

router.patch(
  '/driver-settlements/:id/reject',
  requireAnyPermission(['driver_settlement_review']),
  validateRequest({ params: idParamsSchema, body: transitionSettlementSchema }),
  asyncHandler(rejectSettlementController),
);

router.patch(
  '/driver-settlements/:id/request-changes',
  requireAnyPermission(['driver_settlement_review']),
  validateRequest({ params: idParamsSchema, body: transitionSettlementSchema }),
  asyncHandler(requestChangesSettlementController),
);

router.patch(
  '/driver-settlements/:id/cancel',
  requireAnyPermission(['driver_settlement_cancel']),
  validateRequest({ params: idParamsSchema, body: transitionSettlementSchema }),
  asyncHandler(cancelSettlementController),
);

// Driver portal self-service endpoints
router.get(
  '/me/driver-advances',
  requireAnyPermission(['driver_advance_view_own']),
  validateRequest({ query: driverAdvanceQuerySchema }),
  asyncHandler(listMyAdvancesController),
);

router.get(
  '/me/driver-advances/:id',
  requireAnyPermission(['driver_advance_view_own']),
  validateRequest({ params: idParamsSchema }),
  asyncHandler(getMyAdvanceController),
);

router.get(
  '/me/driver-settlements',
  requireAnyPermission(['driver_settlement_view_own']),
  validateRequest({ query: driverSettlementQuerySchema }),
  asyncHandler(listMySettlementsController),
);

router.get(
  '/me/driver-settlements/:id',
  requireAnyPermission(['driver_settlement_view_own']),
  validateRequest({ params: idParamsSchema }),
  asyncHandler(getMySettlementController),
);

router.post(
  '/me/driver-advances/:id/settlements',
  requireAnyPermission(['driver_settlement_submit_own']),
  validateRequest({ params: idParamsSchema, body: createDriverSettlementSchema }),
  asyncHandler(createMySettlementController),
);

router.patch(
  '/me/driver-settlements/:id/submit',
  requireAnyPermission(['driver_settlement_submit_own']),
  validateRequest({ params: idParamsSchema, body: transitionSettlementSchema }),
  asyncHandler(submitMySettlementController),
);

router.post(
  '/me/driver-settlements/:id/cash-return',
  requireAnyPermission(['driver_cash_return_submit']),
  validateRequest({ params: idParamsSchema, body: cashReturnSchema }),
  asyncHandler(addMyCashReturnController),
);

export default router;
