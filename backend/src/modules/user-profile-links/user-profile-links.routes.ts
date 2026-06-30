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
  createSelfProfileLinkController,
} from './user-profile-links.controller';

const router = Router();

router.use(asyncHandler(authMiddleware));

// ─── Self endpoints (no permission required beyond auth) ───
router.get(
  '/me/profile-links',
  asyncHandler(selfProfileLinksController),
);

router.post(
  '/me/profile-links',
  validateRequest({
    body: z.object({
      profileType: z.enum(['DRIVER', 'MECHANIC', 'EMPLOYEE', 'FINANCE', 'COLLECTOR', 'VENDOR_CONTACT', 'CUSTOMER_CONTACT']),
      profileId: z.string().min(1),
      isPrimary: z.boolean().optional(),
      metadata: z.record(z.string(), z.unknown()).optional(),
    }),
  }),
  asyncHandler(createSelfProfileLinkController),
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
