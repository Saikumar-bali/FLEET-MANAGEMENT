import { Router } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { authMiddleware } from '../../middlewares/authMiddleware';
import { getMyWorkspaceController } from './workspace.controller';
import { listNotificationsController, unreadCountController, markReadController, markAllReadController } from '../notifications/notifications.controller';

const router = Router();

router.use(asyncHandler(authMiddleware));

router.get('/me/workspace', asyncHandler(getMyWorkspaceController));
router.get('/me/notifications', asyncHandler(listNotificationsController));
router.get('/me/notifications/unread-count', asyncHandler(unreadCountController));
router.get('/me/notifications/health', (_req, res) => res.json({ ok: true }));
router.get('/me/notifications/:id/ack', asyncHandler(markReadController));
router.get('/me/notifications-ack-all', asyncHandler(markAllReadController));

export default router;
