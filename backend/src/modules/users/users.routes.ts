import { Router } from 'express';
import { authMiddleware } from '../../middlewares/authMiddleware';
import { requireAnyPermission, requirePermission } from '../../middlewares/permissions';
import { validateRequest } from '../../middlewares/validate';
import { asyncHandler } from '../../utils/asyncHandler';
import {
  createUserController,
  getUserController,
  listUsersController,
  updateUserController,
  updateUserPasswordController,
  updateUserStatusController,
} from './users.controller';
import {
  createUserSchema,
  updateUserPasswordSchema,
  updateUserSchema,
  updateUserStatusSchema,
  userIdParamsSchema,
} from './users.validators';

const router = Router();

router.use(asyncHandler(authMiddleware));

router.get('/', requirePermission('user_view'), asyncHandler(listUsersController));
router.get('/:id', requirePermission('user_view'), validateRequest({ params: userIdParamsSchema }), asyncHandler(getUserController));
router.post('/', requirePermission('user_create'), validateRequest({ body: createUserSchema }), asyncHandler(createUserController));
router.patch(
  '/:id',
  requirePermission('user_update'),
  validateRequest({ params: userIdParamsSchema, body: updateUserSchema }),
  asyncHandler(updateUserController),
);
router.patch(
  '/:id/status',
  requireAnyPermission(['user_delete', 'user_deactivate']),
  validateRequest({ params: userIdParamsSchema, body: updateUserStatusSchema }),
  asyncHandler(updateUserStatusController),
);
router.patch(
  '/:id/password',
  requirePermission('user_update'),
  validateRequest({ params: userIdParamsSchema, body: updateUserPasswordSchema }),
  asyncHandler(updateUserPasswordController),
);

export default router;
