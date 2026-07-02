import { Router } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { authMiddleware } from '../../middlewares/authMiddleware';
import { requirePermission } from '../../middlewares/permissions';
import { validateRequest } from '../../middlewares/validate';
import { z } from 'zod';
import {
  getUserProfileLinksController,
  createProfileLinkForUserController,
} from './user-profile-links.controller';

const router = Router();

router.use(asyncHandler(authMiddleware));

router.get(
  '/:userId/profile-links',
  requirePermission('profile_link_view'),
  asyncHandler(getUserProfileLinksController),
);

router.post(
  '/:userId/profile-links',
  requirePermission('profile_link_create'),
  validateRequest({
    body: z.object({
      profileType: z.enum(['DRIVER', 'MECHANIC', 'EMPLOYEE', 'FINANCE', 'COLLECTOR', 'VENDOR_CONTACT', 'CUSTOMER_CONTACT']),
      profileId: z.string().min(1),
      isPrimary: z.boolean().optional(),
      metadata: z.record(z.string(), z.unknown()).optional(),
    }),
  }),
  asyncHandler(createProfileLinkForUserController),
);

export default router;
