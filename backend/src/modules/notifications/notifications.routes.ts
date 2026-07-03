import { Router } from 'express';

const router = Router();

router.get('/', (_req, res) => res.json({ success: true, data: { items: [] } }));
router.get('/unread-count', (_req, res) => res.json({ success: true, data: { unreadCount: 0 } }));

export default router;
