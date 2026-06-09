import { Router } from 'express';
import { authMiddleware } from '../../middlewares/authMiddleware';
import { requireAnyPermission, requirePermission } from '../../middlewares/permissions';
import { validateRequest } from '../../middlewares/validate';
import { asyncHandler } from '../../utils/asyncHandler';
import {
  assignRolePermissionsController,
  createRoleController,
  listRolesController,
  updateRoleController,
} from './roles.controller';
import {
  assignPermissionsSchema,
  createRoleSchema,
  roleIdParamsSchema,
  updateRoleSchema,
} from './roles.validators';

const router = Router();

router.use(asyncHandler(authMiddleware));

router.get('/', requirePermission('role_view'), asyncHandler(listRolesController));
router.post(
  '/',
  requirePermission('role_create'),
  validateRequest({ body: createRoleSchema }),
  asyncHandler(createRoleController),
);
router.patch(
  '/:id',
  requirePermission('role_update'),
  validateRequest({ params: roleIdParamsSchema, body: updateRoleSchema }),
  asyncHandler(updateRoleController),
);
router.patch(
  '/:id/permissions',
  requirePermission('permission_assign'),
  validateRequest({ params: roleIdParamsSchema, body: assignPermissionsSchema }),
  asyncHandler(assignRolePermissionsController),
);

export default router;
