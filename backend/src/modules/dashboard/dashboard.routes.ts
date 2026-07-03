import { Router } from 'express';
import { authMiddleware } from '../../middlewares/authMiddleware';
import { requirePermission } from '../../middlewares/permissions';
import { asyncHandler } from '../../utils/asyncHandler';
import { getDashboardOverview } from './dashboard.controller';

const router = Router();
router.use(asyncHandler(authMiddleware));

router.get('/overview', requirePermission('dashboard_view'), asyncHandler(getDashboardOverview));

export default router;
