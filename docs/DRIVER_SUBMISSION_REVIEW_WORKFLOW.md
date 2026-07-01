# Driver Submission Review & Approval Workflow

Phase 19: Professional review workflow for records submitted by drivers.

## Overview

Driver-created records from the driver portal are reviewed by managers/admins before becoming final business data. Every review action is audit-logged.

## Workflow Statuses

### Fuel & Expenses
| Status | Description |
|--------|-------------|
| DRAFT | Driver-created, not yet submitted |
| SUBMITTED | Submitted for review |
| APPROVED | Reviewed and approved |
| REJECTED | Reviewed and rejected |
| NEEDS_CHANGES | Returned to driver for corrections |

### Documents
| Status | Description |
|--------|-------------|
| PENDING | Uploaded, awaiting review |
| VERIFIED | Document verified |
| REJECTED | Document rejected |
| NEEDS_CHANGES | Returned for corrections |

### Vehicle Issues
| Status | Description |
|--------|-------------|
| OPEN | Reported by driver |
| ACKNOWLEDGED | Reviewer acknowledged the issue |
| IN_PROGRESS | Being worked on |
| RESOLVED | Issue resolved |
| REJECTED | Issue rejected |

### Inspections
| Status | Description |
|--------|-------------|
| SUBMITTED | Inspection submitted |
| REVIEWED | Inspection reviewed |
| REJECTED | Inspection rejected |
| NEEDS_CHANGES | Returned for corrections |

## API Endpoints

All endpoints require authentication and appropriate permissions.

### List Endpoints
- `GET /api/v1/driver-submissions` — All submissions overview
- `GET /api/v1/driver-submissions/fuel` — Fuel submissions
- `GET /api/v1/driver-submissions/expenses` — Expense submissions
- `GET /api/v1/driver-submissions/documents` — Document submissions
- `GET /api/v1/driver-submissions/issues` — Vehicle issue submissions
- `GET /api/v1/driver-submissions/inspections` — Inspection submissions

Query parameters: `page`, `limit`, `status`, `driverId`, `vehicleId`, `dateFrom`, `dateTo`

### Review Actions
- Fuel: approve, reject, request-changes
- Expenses: approve, reject, request-changes
- Documents: verify, reject, request-changes
- Issues: acknowledge, resolve, reject
- Inspections: review, reject, request-changes

## Permissions

| Permission | Description |
|------------|-------------|
| driver_submission_view | View driver submissions |
| driver_submission_review | Review submissions (reject/request changes) |
| driver_fuel_approve | Approve fuel entries |
| driver_expense_approve | Approve expenses |
| driver_document_verify | Verify documents |
| driver_issue_review | Review vehicle issues |
| driver_inspection_review | Review inspections |

### Role Assignments
- **super_admin**: All review permissions
- **admin**: All review permissions
- **manager**: All review permissions
- **supervisor**: All review permissions
- **driver**: No review permissions
- **viewer**: No review permissions

## Scope Enforcement

Review APIs use Phase 15 scoped enforcement:
- Reviewers can only see submissions inside their data scope
- super_admin can see all
- Admin is NOT automatically global
- Manager with scoped vehicles/drivers only sees matching submissions
- Reviewer cannot approve out-of-scope records
- Driver cannot approve own submission through review endpoints

## Audit Trail

Every review action creates an audit log with:
- `driver_submission.<type>.<action>` action name
- Reviewer user ID
- Submitted driver ID
- Entity ID
- Old status
- New status
- Reason/comment (if provided)

## Frontend Pages

### Admin/Manager Review Pages
- `/driver-submissions/fuel` — Fuel review list
- `/driver-submissions/expenses` — Expense review list
- `/driver-submissions/documents` — Document review list
- `/driver-submissions/issues` — Vehicle issue review list
- `/driver-submissions/inspections` — Inspection review list

All pages feature:
- Status filter dropdown
- Color-coded status pills
- Approve/reject/request-changes actions (permission-gated)
- Reason/comment modal for reject/request-changes

### Driver Portal Updates
- Fuel, Expenses, Documents pages now show color-coded status and reviewer notes

## Security

- Review APIs require `driver_submission_view` permission for list endpoints
- Approve/verify actions require entity-specific permissions
- Reject/request-changes require `driver_submission_review`
- All actions are scope-enforced via Phase 15
- Driver cannot approve own submissions
- Every action is audit-logged

## Testing

- Backend test: `npm run test:driver-submission-review` (19 test cases)
- CI: Included in GitHub Actions pipeline
- Playwright: Manual-only test at `web/e2e/driver-submission-review.spec.ts`

## Deploy

- **Deploy: NO**
- **Full E2E: NO**
