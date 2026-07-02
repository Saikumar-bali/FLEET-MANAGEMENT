import { Router } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { authMiddleware } from '../../middlewares/authMiddleware';
import { getMyWorkspaceController } from './workspace.controller';

const router = Router();

router.use(asyncHandler(authMiddleware));

router.get('/me/workspace', asyncHandler(getMyWorkspaceController));

export default router;
