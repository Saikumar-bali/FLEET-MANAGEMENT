import { Router } from 'express';
import { authMiddleware } from '../../middlewares/authMiddleware';
import { requirePermission } from '../../middlewares/permissions';
import { asyncHandler } from '../../utils/asyncHandler';
import { driverAcceptTripAssignmentController, driverStartAssignedTripController, driverEndAssignedTripController } from './trip-assignment.controller';

const router = Router();
router.use(asyncHandler(authMiddleware));

router.post('/me/driver-trip-assignments/:id/confirm', requirePermission('driver_trip_accept'), asyncHandler(driverAcceptTripAssignmentController));
router.post('/me/driver-trip-assignments/:id/start', requirePermission('driver_trip_start'), asyncHandler(driverStartAssignedTripController));
router.post('/me/driver-trip-assignments/:id/end', requirePermission('driver_trip_end'), asyncHandler(driverEndAssignedTripController));

export default router;
