import { Router } from 'express';
import { authMiddleware } from '../../middlewares/authMiddleware';
import { asyncHandler } from '../../utils/asyncHandler';
import { getBoardController, checkConflictsController, assignTripController, getRouteEstimateController } from './dispatch.controller';

const router = Router();
router.use(asyncHandler(authMiddleware));

router.get('/board', asyncHandler(getBoardController));
router.post('/check-conflicts', asyncHandler(checkConflictsController));
router.post('/assign', asyncHandler(assignTripController));
router.get('/route-estimate', asyncHandler(getRouteEstimateController));

export default router;
