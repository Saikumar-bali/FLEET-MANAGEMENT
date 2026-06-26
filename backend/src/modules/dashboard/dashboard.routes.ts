import { Router } from 'express';
import { authMiddleware } from '../../middlewares/authMiddleware';
import { asyncHandler } from '../../utils/asyncHandler';
import { getDashboardOverview } from './dashboard.controller';
import { getDriverDashboardController } from './driver-dashboard.controller';

const router = Router();
router.use(asyncHandler(authMiddleware));

router.get('/overview', asyncHandler(getDashboardOverview));
router.get('/driver', asyncHandler(getDriverDashboardController));

export default router;
