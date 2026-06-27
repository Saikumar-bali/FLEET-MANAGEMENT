import { Router } from 'express';
import { authMiddleware } from '../../middlewares/authMiddleware';
import { requirePermission } from '../../middlewares/permissions';
import { validateRequest } from '../../middlewares/validate';
import { asyncHandler } from '../../utils/asyncHandler';
import { reportsController as c } from './reports.controller';
import * as v from './reports.validators';

const router = Router();
router.use(asyncHandler(authMiddleware));

router.get(
  '/vehicle-utilization',
  requirePermission('report_view'),
  validateRequest({ query: v.dateRangeQuerySchema }),
  asyncHandler(c.vehicleUtilization),
);
router.get(
  '/trip-summary',
  requirePermission('report_view'),
  validateRequest({ query: v.dateRangeQuerySchema }),
  asyncHandler(c.tripSummary),
);
router.get(
  '/fuel-summary',
  requirePermission('report_view'),
  validateRequest({ query: v.dateRangeQuerySchema }),
  asyncHandler(c.fuelSummary),
);
router.get(
  '/fuel-missing-receipts',
  requirePermission('report_view'),
  validateRequest({ query: v.dateRangeQuerySchema }),
  asyncHandler(c.fuelMissingReceipts),
);
router.get(
  '/finance-pnl',
  requirePermission('report_view'),
  validateRequest({ query: v.dateRangeQuerySchema }),
  asyncHandler(c.financePnl),
);
router.get(
  '/compliance-expiry',
  requirePermission('report_view'),
  validateRequest({ query: v.complianceExpiryQuerySchema }),
  asyncHandler(c.complianceExpiry),
);
router.get(
  '/document-verification',
  requirePermission('report_view'),
  validateRequest({ query: v.dateRangeQuerySchema }),
  asyncHandler(c.documentVerification),
);
router.get(
  '/maintenance-summary',
  requirePermission('report_view'),
  validateRequest({ query: v.dateRangeQuerySchema }),
  asyncHandler(c.maintenanceSummary),
);
router.get(
  '/:key/export.csv',
  requirePermission('report_export'),
  validateRequest({ params: v.reportKeyParamSchema, query: v.dateRangeQuerySchema }),
  asyncHandler(c.exportCsv),
);

export default router;