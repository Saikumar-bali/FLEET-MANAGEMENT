import { Router } from 'express';
import { authMiddleware } from '../../middlewares/authMiddleware';
import { requirePermission, requireAnyPermission } from '../../middlewares/permissions';
import { validateRequest } from '../../middlewares/validate';
import { asyncHandler } from '../../utils/asyncHandler';
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
  requireAnyPermission(['trip_update', 'trip_create']),
  validateRequest({ params: tripIdParamsSchema, body: updateTripSchema }),
  asyncHandler(updateTripController),
);

router.post(
  '/:id/schedule',
  requireAnyPermission(['trip_update', 'trip_create']),
  validateRequest({ params: tripIdParamsSchema, body: scheduleTripSchema }),
  asyncHandler(scheduleTripController),
);

router.post(
  '/:id/start',
  requireAnyPermission(['trip_start', 'trip_create']),
  validateRequest({ params: tripIdParamsSchema, body: startTripSchema }),
  asyncHandler(startTripController),
);

router.post(
  '/:id/complete',
  requireAnyPermission(['trip_end', 'trip_create']),
  validateRequest({ params: tripIdParamsSchema, body: completeTripSchema }),
  asyncHandler(completeTripController),
);

router.post(
  '/:id/cancel',
  requireAnyPermission(['trip_cancel', 'trip_create']),
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
