import { Router } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { authMiddleware } from '../../middlewares/authMiddleware';
import { requirePermission, requireAnyPermission } from '../../middlewares/permissions';
import {
  listAllSubmissionsController,
  listFuelSubmissionsController, approveFuelController, rejectFuelController, requestChangesFuelController,
  listExpenseSubmissionsController, approveExpenseController, rejectExpenseController, requestChangesExpenseController,
  listDocumentSubmissionsController, verifyDocumentController, rejectDocumentController, requestChangesDocumentController,
  listIssueSubmissionsController, acknowledgeIssueController, resolveIssueController, rejectIssueController,
  listInspectionSubmissionsController, reviewInspectionController, rejectInspectionController, requestChangesInspectionController,
} from './driver-submissions.controller';

const router = Router();

router.use(asyncHandler(authMiddleware));

// ─── List endpoints ────────────────────────────────────────────

router.get('/driver-submissions',
  requirePermission('driver_submission_view'),
  asyncHandler(listAllSubmissionsController),
);

router.get('/driver-submissions/fuel',
  requirePermission('driver_submission_view'),
  asyncHandler(listFuelSubmissionsController),
);

router.get('/driver-submissions/expenses',
  requirePermission('driver_submission_view'),
  asyncHandler(listExpenseSubmissionsController),
);

router.get('/driver-submissions/documents',
  requirePermission('driver_submission_view'),
  asyncHandler(listDocumentSubmissionsController),
);

router.get('/driver-submissions/issues',
  requirePermission('driver_submission_view'),
  asyncHandler(listIssueSubmissionsController),
);

router.get('/driver-submissions/inspections',
  requirePermission('driver_submission_view'),
  asyncHandler(listInspectionSubmissionsController),
);

// ─── Fuel review actions ───────────────────────────────────────

router.patch('/driver-submissions/fuel/:id/approve',
  requirePermission('driver_fuel_approve'),
  asyncHandler(approveFuelController),
);

router.patch('/driver-submissions/fuel/:id/reject',
  requirePermission('driver_submission_review'),
  asyncHandler(rejectFuelController),
);

router.patch('/driver-submissions/fuel/:id/request-changes',
  requirePermission('driver_submission_review'),
  asyncHandler(requestChangesFuelController),
);

// ─── Expense review actions ────────────────────────────────────

router.patch('/driver-submissions/expenses/:id/approve',
  requirePermission('driver_expense_approve'),
  asyncHandler(approveExpenseController),
);

router.patch('/driver-submissions/expenses/:id/reject',
  requirePermission('driver_submission_review'),
  asyncHandler(rejectExpenseController),
);

router.patch('/driver-submissions/expenses/:id/request-changes',
  requirePermission('driver_submission_review'),
  asyncHandler(requestChangesExpenseController),
);

// ─── Document review actions ───────────────────────────────────

router.patch('/driver-submissions/documents/:id/verify',
  requirePermission('driver_document_verify'),
  asyncHandler(verifyDocumentController),
);

router.patch('/driver-submissions/documents/:id/reject',
  requirePermission('driver_submission_review'),
  asyncHandler(rejectDocumentController),
);

router.patch('/driver-submissions/documents/:id/request-changes',
  requirePermission('driver_submission_review'),
  asyncHandler(requestChangesDocumentController),
);

// ─── Vehicle issue review actions ──────────────────────────────

router.patch('/driver-submissions/issues/:id/acknowledge',
  requirePermission('driver_issue_review'),
  asyncHandler(acknowledgeIssueController),
);

router.patch('/driver-submissions/issues/:id/resolve',
  requirePermission('driver_issue_review'),
  asyncHandler(resolveIssueController),
);

router.patch('/driver-submissions/issues/:id/reject',
  requirePermission('driver_submission_review'),
  asyncHandler(rejectIssueController),
);

// ─── Inspection review actions ─────────────────────────────────

router.patch('/driver-submissions/inspections/:id/review',
  requirePermission('driver_inspection_review'),
  asyncHandler(reviewInspectionController),
);

router.patch('/driver-submissions/inspections/:id/reject',
  requirePermission('driver_submission_review'),
  asyncHandler(rejectInspectionController),
);

router.patch('/driver-submissions/inspections/:id/request-changes',
  requirePermission('driver_submission_review'),
  asyncHandler(requestChangesInspectionController),
);

export default router;
