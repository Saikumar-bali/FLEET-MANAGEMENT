import { Router } from 'express';
import { authMiddleware } from '../../middlewares/authMiddleware';
import { requirePermission } from '../../middlewares/permissions';
import { validateRequest } from '../../middlewares/validate';
import { asyncHandler } from '../../utils/asyncHandler';
import * as c from './repairs.controller';
import * as v from './repairs.validators';

const router = Router();
router.use(asyncHandler(authMiddleware));
router.get('/', requirePermission('repair_view'), validateRequest({ query: v.repairQuerySchema }), asyncHandler(c.listRepairsController));
router.post('/', requirePermission('repair_create'), validateRequest({ body: v.createRepairSchema }), asyncHandler(c.createRepairController));
router.get('/:id', requirePermission('repair_view'), validateRequest({ params: v.repairIdParamsSchema }), asyncHandler(c.getRepairController));
router.patch('/:id', requirePermission('repair_update'), validateRequest({ params: v.repairIdParamsSchema, body: v.updateRepairSchema }), asyncHandler(c.updateRepairController));
router.post('/:id/start', requirePermission('repair_update'), validateRequest({ params: v.repairIdParamsSchema, body: v.repairActionSchema }), asyncHandler(c.startRepairController));
router.post('/:id/complete', requirePermission('repair_close'), validateRequest({ params: v.repairIdParamsSchema, body: v.repairActionSchema }), asyncHandler(c.completeRepairController));
router.post('/:id/cancel', requirePermission('repair_close'), validateRequest({ params: v.repairIdParamsSchema, body: v.repairActionSchema }), asyncHandler(c.cancelRepairController));
router.delete('/:id', requirePermission('repair_close'), validateRequest({ params: v.repairIdParamsSchema, body: v.repairActionSchema }), asyncHandler(c.cancelRepairController));
export default router;
