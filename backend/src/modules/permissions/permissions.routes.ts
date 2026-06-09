import { Router } from 'express';
import { authMiddleware } from '../../middlewares/authMiddleware';
import { requireAnyPermission } from '../../middlewares/permissions';
import { asyncHandler } from '../../utils/asyncHandler';
import { listPermissionsController } from './permissions.controller';

const router = Router();

router.use(asyncHandler(authMiddleware));
router.get('/', requireAnyPermission(['permission_view', 'permission_assign']), asyncHandler(listPermissionsController));

export default router;
