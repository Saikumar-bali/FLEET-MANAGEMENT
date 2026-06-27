import { Router } from 'express';
import { authMiddleware } from '../../middlewares/authMiddleware';
import { requireAnyPermission, requirePermission } from '../../middlewares/permissions';
import { validateRequest } from '../../middlewares/validate';
import { asyncHandler } from '../../utils/asyncHandler';
import * as c from './alerts.controller';
import * as v from './alerts.validators';

const router = Router();
router.use(asyncHandler(authMiddleware));

// ─── Alerts ───
router.get(
  '/',
  requirePermission('alerts_view'),
  validateRequest({ query: v.listAlertsQuerySchema }),
  asyncHandler(c.listAlertsController),
);
router.get(
  '/summary',
  requirePermission('alerts_view'),
  asyncHandler(c.getAlertSummaryController),
);
router.post(
  '/generate',
  requirePermission('alerts_manage'),
  validateRequest({ body: v.generateAlertsSchema }),
  asyncHandler(c.generateAlertsController),
);
router.get(
  '/:id',
  requirePermission('alerts_view'),
  validateRequest({ params: v.alertIdParamsSchema }),
  asyncHandler(c.getAlertController),
);
router.post(
  '/:id/read',
  requirePermission('alerts_resolve'),
  validateRequest({ params: v.alertIdParamsSchema }),
  asyncHandler(c.readAlertController),
);
router.post(
  '/:id/resolve',
  requirePermission('alerts_resolve'),
  validateRequest({ params: v.alertIdParamsSchema }),
  asyncHandler(c.resolveAlertController),
);
router.post(
  '/:id/dismiss',
  requirePermission('alerts_resolve'),
  validateRequest({ params: v.alertIdParamsSchema }),
  asyncHandler(c.dismissAlertController),
);
router.post(
  '/bulk-resolve',
  requirePermission('alerts_manage'),
  validateRequest({ body: v.bulkResolveSchema }),
  asyncHandler(c.bulkResolveController),
);

// ─── Alert Rules ───
const rulesRouter = Router();
rulesRouter.use(asyncHandler(authMiddleware));
rulesRouter.get(
  '/',
  requireAnyPermission(['alerts_view', 'alerts_manage']),
  validateRequest({ query: v.listAlertRulesQuerySchema }),
  asyncHandler(c.listAlertRulesController),
);
rulesRouter.get(
  '/:id',
  requireAnyPermission(['alerts_view', 'alerts_manage']),
  validateRequest({ params: v.alertRuleIdParamsSchema }),
  asyncHandler(c.getAlertRuleController),
);
rulesRouter.put(
  '/:id',
  requirePermission('alerts_manage'),
  validateRequest({ params: v.alertRuleIdParamsSchema, body: v.updateAlertRuleSchema }),
  asyncHandler(c.updateAlertRuleController),
);

export const alertsMainRouter = router;
export const alertRulesRouter = rulesRouter;
export default router;