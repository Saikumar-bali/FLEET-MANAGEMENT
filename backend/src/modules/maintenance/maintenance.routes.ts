import { Router } from 'express';
import { authMiddleware } from '../../middlewares/authMiddleware';
import { requirePermission } from '../../middlewares/permissions';
import { validateRequest } from '../../middlewares/validate';
import { asyncHandler } from '../../utils/asyncHandler';
import * as c from './maintenance.controller';
import * as v from './maintenance.validators';

const router = Router();
router.use(asyncHandler(authMiddleware));
router.get('/', requirePermission('maintenance_view'), validateRequest({ query: v.maintenanceQuerySchema }), asyncHandler(c.listMaintenanceController));
router.post('/', requirePermission('maintenance_create'), validateRequest({ body: v.createMaintenanceSchema }), asyncHandler(c.createMaintenanceController));
router.get('/:id', requirePermission('maintenance_view'), validateRequest({ params: v.maintenanceIdParamsSchema }), asyncHandler(c.getMaintenanceController));
router.patch('/:id', requirePermission('maintenance_update'), validateRequest({ params: v.maintenanceIdParamsSchema, body: v.updateMaintenanceSchema }), asyncHandler(c.updateMaintenanceController));
router.post('/:id/submit', requirePermission('maintenance_submit'), validateRequest({ params: v.maintenanceIdParamsSchema, body: v.maintenanceActionSchema }), asyncHandler(c.submitMaintenanceController));
router.post('/:id/approve', requirePermission('maintenance_approve'), validateRequest({ params: v.maintenanceIdParamsSchema, body: v.maintenanceActionSchema }), asyncHandler(c.approveMaintenanceController));
router.post('/:id/reject', requirePermission('maintenance_approve'), validateRequest({ params: v.maintenanceIdParamsSchema, body: v.maintenanceActionSchema }), asyncHandler(c.rejectMaintenanceController));
router.post('/:id/start', requirePermission('maintenance_assign'), validateRequest({ params: v.maintenanceIdParamsSchema, body: v.maintenanceActionSchema }), asyncHandler(c.startMaintenanceController));
router.post('/:id/complete', requirePermission('maintenance_complete'), validateRequest({ params: v.maintenanceIdParamsSchema, body: v.maintenanceActionSchema }), asyncHandler(c.completeMaintenanceController));
router.post('/:id/cancel', requirePermission('maintenance_delete'), validateRequest({ params: v.maintenanceIdParamsSchema, body: v.maintenanceActionSchema }), asyncHandler(c.cancelMaintenanceController));

export default router;
