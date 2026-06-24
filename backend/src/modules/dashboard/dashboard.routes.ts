import { Router } from 'express';
import { authMiddleware } from '../../middlewares/authMiddleware';
import { asyncHandler } from '../../utils/asyncHandler';
import { getDashboardOverview } from './dashboard.controller';

const router = Router();
router.use(asyncHandler(authMiddleware));

router.get('/overview', asyncHandler(getDashboardOverview));

export default router;
