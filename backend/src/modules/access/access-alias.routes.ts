import { Router } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { authMiddleware } from '../../middlewares/authMiddleware';
import { requirePermission } from '../../middlewares/permissions';
import {
  listPermissionOverridesController,
  setPermissionOverrideController,
  removePermissionOverrideController,
  listDataScopesController,
  grantDataScopeController,
  removeDataScopeController,
  effectivePermissionsController,
} from './access-permissions.controller';

const router = Router();

router.use(asyncHandler(authMiddleware));

router.get(
  '/:id/effective-permissions',
  requirePermission('user_view'),
  asyncHandler(effectivePermissionsController),
);

router.get(
  '/:id/permission-overrides',
  requirePermission('user_view'),
  asyncHandler(listPermissionOverridesController),
);

router.put(
  '/:id/permission-overrides',
  requirePermission('permission_assign'),
  asyncHandler(setPermissionOverrideController),
);

router.delete(
  '/:id/permission-overrides/:permissionId',
  requirePermission('permission_assign'),
  asyncHandler(removePermissionOverrideController),
);

router.get(
  '/:id/data-scopes',
  requirePermission('user_view'),
  asyncHandler(listDataScopesController),
);

router.put(
  '/:id/data-scopes',
  requirePermission('permission_assign'),
  asyncHandler(grantDataScopeController),
);

router.delete(
  '/:id/data-scopes/:scopeId',
  requirePermission('permission_assign'),
  asyncHandler(removeDataScopeController),
);

export default router;
