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
} from './access-permissions.controller';

const router = Router();

router.use(asyncHandler(authMiddleware));

router.get(
  '/users/:id/effective-permissions',
  requirePermission('user_view'),
  asyncHandler(async (req: any, res: any) => {
    const { getEffectivePermissions } = await import('./effective-permissions.service');
    const result = await getEffectivePermissions(req.params.id);
    res.json(result);
  }),
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

export default router;
