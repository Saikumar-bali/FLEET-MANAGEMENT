import { Router } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { authMiddleware } from '../../middlewares/authMiddleware';
import { requirePermission } from '../../middlewares/permissions';
import { sendSuccess } from '../../utils/response';
import {
  listPermissionOverridesController,
  setPermissionOverrideController,
  removePermissionOverrideController,
  listDataScopesController,
  grantDataScopeController,
  removeDataScopeController,
  effectivePermissionsController,
} from './access-permissions.controller';
import { getUserActivityController } from '../users/users-activity.controller';

const router = Router();

router.use(asyncHandler(authMiddleware));

router.get(
  '/users/:id/effective-permissions',
  requirePermission('user_view'),
  asyncHandler(effectivePermissionsController),
);

router.get(
  '/users/:id/permission-overrides',
  requirePermission('user_view'),
  asyncHandler(listPermissionOverridesController),
);

router.put(
  '/users/:id/permission-overrides',
  requirePermission('permission_assign'),
  asyncHandler(setPermissionOverrideController),
);

router.delete(
  '/users/:id/permission-overrides/:permissionId',
  requirePermission('permission_assign'),
  asyncHandler(removePermissionOverrideController),
);

router.get(
  '/users/:id/data-scopes',
  requirePermission('user_view'),
  asyncHandler(listDataScopesController),
);

router.put(
  '/users/:id/data-scopes',
  requirePermission('permission_assign'),
  asyncHandler(grantDataScopeController),
);

router.delete(
  '/users/:id/data-scopes/:scopeId',
  requirePermission('permission_assign'),
  asyncHandler(removeDataScopeController),
);

router.get(
  '/users/:id/activity',
  requirePermission('user_view'),
  asyncHandler(getUserActivityController),
);

export default router;
