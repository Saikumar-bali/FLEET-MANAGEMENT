import { Router } from 'express';
import multer from 'multer';
import { authMiddleware } from '../../middlewares/authMiddleware';
import { requireAnyPermission, requirePermission } from '../../middlewares/permissions';
import { asyncHandler } from '../../utils/asyncHandler';
import {
  approveBillingController,
  listPodBillingChainController,
  rejectBillingController,
  rejectPodController,
  uploadTripPodController,
  verifyPodController,
} from './pod-billing.controller';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

const router = Router();
router.use(asyncHandler(authMiddleware));

router.post(
  '/me/driver-trips/:id/pod',
  requirePermission('driver_pod_upload'),
  upload.single('file'),
  asyncHandler(uploadTripPodController),
);

router.get(
  '/pod-billing/chain',
  requireAnyPermission(['driver_submission_view', 'driver_document_verify', 'documents_verify', 'trip_billing_view', 'finance_approve']),
  asyncHandler(listPodBillingChainController),
);

router.post(
  '/pod-billing/pods/:id/verify',
  requireAnyPermission(['driver_document_verify', 'documents_verify']),
  asyncHandler(verifyPodController),
);

router.post(
  '/pod-billing/pods/:id/reject',
  requireAnyPermission(['driver_document_verify', 'documents_verify']),
  asyncHandler(rejectPodController),
);

router.post(
  '/pod-billing/billings/:id/approve',
  requirePermission('finance_approve'),
  asyncHandler(approveBillingController),
);

router.post(
  '/pod-billing/billings/:id/reject',
  requirePermission('finance_approve'),
  asyncHandler(rejectBillingController),
);

export default router;
