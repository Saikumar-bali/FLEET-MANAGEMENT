import { Router } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { authMiddleware } from '../../middlewares/authMiddleware';
import { requirePermission } from '../../middlewares/permissions';
import { validateRequest } from '../../middlewares/validate';
import { z } from 'zod';
import {
  listProfileLinksController,
  getProfileLinkByIdController,
  getUserProfileLinksController,
  createProfileLinkController,
  updateProfileLinkController,
  revokeProfileLinkController,
  deleteProfileLinkController,
  selfProfileLinksController,
  createProfileLinkForUserController,
  listAvailableDriversController,
} from './user-profile-links.controller';

const router = Router();

router.use(asyncHandler(authMiddleware));

// ─── Self endpoints (read-only) ───
router.get(
  '/me/profile-links',
  asyncHandler(selfProfileLinksController),
);

// ─── User-scoped admin aliases (under /users/:userId) ───
// NOTE: These are registered on the same router but the path prefix in app.ts is /api/v1/user-profile-links
// We need separate routes under /users/:userId path — these are handled via a separate router mounted at /api/v1/users
// See user-profile-links-user-aliases.ts for that

// ─── Available drivers for linking ───
router.get(
  '/available-drivers',
  requirePermission('profile_link_view'),
  asyncHandler(listAvailableDriversController),
);

// ─── Admin endpoints ───
router.get(
  '/',
  requirePermission('profile_link_view'),
  asyncHandler(listProfileLinksController),
);

router.get(
  '/:id',
  requirePermission('profile_link_view'),
  asyncHandler(getProfileLinkByIdController),
);

router.get(
  '/user/:userId',
  requirePermission('profile_link_view'),
  asyncHandler(getUserProfileLinksController),
);

router.post(
  '/',
  requirePermission('profile_link_create'),
  validateRequest({
    body: z.object({
      userId: z.string().min(1),
      profileType: z.enum(['DRIVER', 'MECHANIC', 'EMPLOYEE', 'FINANCE', 'COLLECTOR', 'VENDOR_CONTACT', 'CUSTOMER_CONTACT']),
      profileId: z.string().min(1),
      isPrimary: z.boolean().optional(),
      metadata: z.record(z.string(), z.unknown()).optional(),
    }),
  }),
  asyncHandler(createProfileLinkController),
);

router.patch(
  '/:id',
  requirePermission('profile_link_update'),
  validateRequest({
    body: z.object({
      isPrimary: z.boolean().optional(),
      status: z.enum(['ACTIVE', 'INACTIVE', 'REVOKED']).optional(),
      metadata: z.record(z.string(), z.unknown()).optional(),
    }),
  }),
  asyncHandler(updateProfileLinkController),
);

router.patch(
  '/:id/revoke',
  requirePermission('profile_link_revoke'),
  asyncHandler(revokeProfileLinkController),
);

router.delete(
  '/:id',
  requirePermission('profile_link_delete'),
  asyncHandler(deleteProfileLinkController),
);

export default router;
