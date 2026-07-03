import { Router } from 'express';
import { authMiddleware } from '../../middlewares/authMiddleware';
import { requirePermission } from '../../middlewares/permissions';
import { validateRequest } from '../../middlewares/validate';
import { asyncHandler } from '../../utils/asyncHandler';
import { reassignTripDriverController } from './trip-assignment.controller';
import {
  cancelTripController,
  completeTripController,
  createTripController,
  getTripController,
  getTripHistoryController,
  listTripsController,
  scheduleTripController,
  startTripController,
  updateTripController,
} from './trips.controller';
import {
  cancelTripSchema,
  completeTripSchema,
  createTripSchema,
  reassignTripSchema,
  scheduleTripSchema,
  startTripSchema,
  tripIdParamsSchema,
  tripQuerySchema,
  updateTripSchema,
} from './trips.validators';

const router = Router();

router.use(asyncHandler(authMiddleware));

router.get(
  '/',
  requirePermission('trip_view'),
  validateRequest({ query: tripQuerySchema }),
  asyncHandler(listTripsController),
);

router.get(
  '/:id',
  requirePermission('trip_view'),
  validateRequest({ params: tripIdParamsSchema }),
  asyncHandler(getTripController),
);

router.post(
  '/',
  requirePermission('trip_create'),
  validateRequest({ body: createTripSchema }),
  asyncHandler(createTripController),
);

router.patch(
  '/:id',
  requirePermission('trip_update'),
  validateRequest({ params: tripIdParamsSchema, body: updateTripSchema }),
  asyncHandler(updateTripController),
);

router.post(
  '/:id/schedule',
  requirePermission('trip_update'),
  validateRequest({ params: tripIdParamsSchema, body: scheduleTripSchema }),
  asyncHandler(scheduleTripController),
);

router.post(
  '/:id/reassign-driver',
  requirePermission('trip_update'),
  validateRequest({ params: tripIdParamsSchema, body: reassignTripSchema }),
  asyncHandler(reassignTripDriverController),
);

router.post(
  '/:id/start',
  requirePermission('trip_start'),
  validateRequest({ params: tripIdParamsSchema, body: startTripSchema }),
  asyncHandler(startTripController),
);

router.post(
  '/:id/complete',
  requirePermission('trip_end'),
  validateRequest({ params: tripIdParamsSchema, body: completeTripSchema }),
  asyncHandler(completeTripController),
);

router.post(
  '/:id/cancel',
  requirePermission('trip_cancel'),
  validateRequest({ params: tripIdParamsSchema, body: cancelTripSchema }),
  asyncHandler(cancelTripController),
);

router.get(
  '/:id/history',
  requirePermission('trip_view'),
  validateRequest({ params: tripIdParamsSchema }),
  asyncHandler(getTripHistoryController),
);

export default router;
