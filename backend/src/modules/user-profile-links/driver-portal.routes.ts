import { Router } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { authMiddleware } from '../../middlewares/authMiddleware';
import {
  driverProfileController,
  driverTripsController,
  driverVehiclesController,
  driverDocumentsController,
  driverFuelController,
  driverExpensesController,
} from './driver-portal.controller';

const router = Router();

router.use(asyncHandler(authMiddleware));

router.get('/me/driver-profile', asyncHandler(driverProfileController));
router.get('/me/driver-trips', asyncHandler(driverTripsController));
router.get('/me/driver-vehicles', asyncHandler(driverVehiclesController));
router.get('/me/driver-documents', asyncHandler(driverDocumentsController));
router.get('/me/driver-fuel', asyncHandler(driverFuelController));
router.get('/me/driver-expenses', asyncHandler(driverExpensesController));

export default router;
