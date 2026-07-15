import { Router } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { authMiddleware } from '../../middlewares/authMiddleware';
import { requirePermission } from '../../middlewares/permissions';
import { validateRequest } from '../../middlewares/validate';
import {
  createStaffProfileController,
  getStaffProfileByIdController,
  listStaffProfilesController,
  updateStaffProfileController,
  deleteStaffProfileController,
  listAvailableStaffProfilesController,
} from './staff-profiles.controller';
import {
  createStaffProfileSchema,
  updateStaffProfileSchema,
  staffProfileQuerySchema,
  staffProfileIdParamsSchema,
} from './staff-profiles.validators';

const router = Router();

router.use(asyncHandler(authMiddleware));

router.get(
  '/',
  requirePermission('profile_link_view'),
  validateRequest({ query: staffProfileQuerySchema }),
  asyncHandler(listStaffProfilesController),
);

router.get(
  '/available',
  requirePermission('profile_link_view'),
  asyncHandler(listAvailableStaffProfilesController),
);

router.get(
  '/:id',
  requirePermission('profile_link_view'),
  validateRequest({ params: staffProfileIdParamsSchema }),
  asyncHandler(getStaffProfileByIdController),
);

router.post(
  '/',
  requirePermission('profile_link_create'),
  validateRequest({ body: createStaffProfileSchema }),
  asyncHandler(createStaffProfileController),
);

router.patch(
  '/:id',
  requirePermission('profile_link_update'),
  validateRequest({ params: staffProfileIdParamsSchema, body: updateStaffProfileSchema }),
  asyncHandler(updateStaffProfileController),
);

router.delete(
  '/:id',
  requirePermission('profile_link_delete'),
  validateRequest({ params: staffProfileIdParamsSchema }),
  asyncHandler(deleteStaffProfileController),
);

export default router;
