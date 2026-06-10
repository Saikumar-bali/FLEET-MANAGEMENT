import { Router } from 'express';
import { authMiddleware } from '../../middlewares/authMiddleware';
import { requirePermission, requireAnyPermission } from '../../middlewares/permissions';
import { validateRequest } from '../../middlewares/validate';
import { asyncHandler } from '../../utils/asyncHandler';
import {
  createDriverController,
  getDriverController,
  listDriversController,
  updateDriverController,
  updateDriverStatusController,
} from './drivers.controller';
import {
  createDriverSchema,
  driverIdParamsSchema,
  driverQuerySchema,
  updateDriverSchema,
  updateDriverStatusSchema,
} from './drivers.validators';

const router = Router();

router.use(asyncHandler(authMiddleware));

router.get(
  '/',
  requirePermission('driver_view'),
  validateRequest({ query: driverQuerySchema }),
  asyncHandler(listDriversController),
);
router.get(
  '/:id',
  requirePermission('driver_view'),
  validateRequest({ params: driverIdParamsSchema }),
  asyncHandler(getDriverController),
);
router.post(
  '/',
  requirePermission('driver_create'),
  validateRequest({ body: createDriverSchema }),
  asyncHandler(createDriverController),
);
router.patch(
  '/:id',
  requirePermission('driver_update'),
  validateRequest({ params: driverIdParamsSchema, body: updateDriverSchema }),
  asyncHandler(updateDriverController),
);
router.patch(
  '/:id/status',
  requireAnyPermission(['driver_update', 'driver_delete']),
  validateRequest({ params: driverIdParamsSchema, body: updateDriverStatusSchema }),
  asyncHandler(updateDriverStatusController),
);

export default router;
