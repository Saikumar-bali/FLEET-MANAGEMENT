import { Router } from 'express';
import { authMiddleware } from '../../middlewares/authMiddleware';
import { requirePermission, requireAnyPermission } from '../../middlewares/permissions';
import { validateRequest } from '../../middlewares/validate';
import { asyncHandler } from '../../utils/asyncHandler';
import {
  createVehicleController,
  getVehicleController,
  listVehiclesController,
  updateVehicleController,
  updateVehicleStatusController,
} from './vehicles.controller';
import {
  createVehicleSchema,
  updateVehicleSchema,
  updateVehicleStatusSchema,
  vehicleIdParamsSchema,
  vehicleQuerySchema,
} from './vehicles.validators';

const router = Router();

router.use(asyncHandler(authMiddleware));

router.get(
  '/',
  requirePermission('vehicle_view'),
  validateRequest({ query: vehicleQuerySchema }),
  asyncHandler(listVehiclesController),
);
router.get(
  '/:id',
  requirePermission('vehicle_view'),
  validateRequest({ params: vehicleIdParamsSchema }),
  asyncHandler(getVehicleController),
);
router.post(
  '/',
  requirePermission('vehicle_create'),
  validateRequest({ body: createVehicleSchema }),
  asyncHandler(createVehicleController),
);
router.patch(
  '/:id',
  requirePermission('vehicle_update'),
  validateRequest({ params: vehicleIdParamsSchema, body: updateVehicleSchema }),
  asyncHandler(updateVehicleController),
);
router.patch(
  '/:id/status',
  requireAnyPermission(['vehicle_update', 'vehicle_delete']),
  validateRequest({ params: vehicleIdParamsSchema, body: updateVehicleStatusSchema }),
  asyncHandler(updateVehicleStatusController),
);

export default router;
