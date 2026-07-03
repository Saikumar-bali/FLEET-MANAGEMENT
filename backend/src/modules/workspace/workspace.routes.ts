import { Router } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { authMiddleware } from '../../middlewares/authMiddleware';
import { getMyWorkspaceController } from './workspace.controller';
import { listNotificationsController, markAllReadController, markReadController, unreadCountController } from '../notifications/notifications.controller';

const router = Router();

router.use(asyncHandler(authMiddleware));

router.get('/me/workspace', asyncHandler(getMyWorkspaceController));
router.get('/me/notifications', asyncHandler(listNotificationsController));
router.get('/me/notifications/unread-count', asyncHandler(unreadCountController));
router.post('/me/notifications/read-all', asyncHandler(markAllReadController));
router.post('/me/notifications/:id/read', asyncHandler(markReadController));

export default router;
