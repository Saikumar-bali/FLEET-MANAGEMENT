# Phase 6 — Maintenance & Repair Workflow

## Branch

`phase-6-maintenance-repair-workflow`

## Files Changed

### Backend
| File | Change |
|------|--------|
| `backend/prisma/schema.prisma` | Added `MaintenancePriority`, `MaintenanceStatus`, `RepairStatus` enums, `MaintenanceRequest`, `Repair` models |
| `backend/src/constants/rbac.ts` | Added maintenance/repair permissions and role assignments |
| `backend/src/modules/maintenance/validators.ts` | Zod schemas for list, create, update, action, query |
| `backend/src/modules/maintenance/maintenance.service.ts` | CRUD + status transition with rules |
| `backend/src/modules/maintenance/maintenance.controller.ts` | Request handlers with audit logging |
| `backend/src/modules/maintenance/maintenance.routes.ts` | 9 endpoints under `/api/v1/maintenance` |
| `backend/src/modules/repairs/validators.ts` | Zod schemas with cost validation |
| `backend/src/modules/repairs/repairs.service.ts` | CRUD + status transition with total cost |
| `backend/src/modules/repairs/repairs.controller.ts` | Request handlers with audit logging |
| `backend/src/modules/repairs/repairs.routes.ts` | 7 endpoints under `/api/v1/repairs` |
| `backend/src/app.ts` | Registered maintenance and repair route modules |
| `backend/src/docs/openapi.ts` | Maintenance/Repairs tags, schemas, all paths with security |
| `backend/scripts/maintenance-repair-workflow-test.ts` | API integration test (25 scenarios) |

### Web
| File | Change |
|------|--------|
| `web/src/types/auth.ts` | Added `MaintenanceRecord`, `RepairRecord`, status/priority types |
| `web/src/services/api.ts` | Added maintenance/repair API functions |
| `web/src/pages/MaintenanceListPage.tsx` | List page with filters and status badges |
| `web/src/pages/MaintenanceDetailPage.tsx` | Create/edit/detail page with action buttons |
| `web/src/pages/RepairListPage.tsx` | List page with filters |
| `web/src/pages/RepairDetailPage.tsx` | Create/edit/detail page with action buttons |
| `web/src/app/App.tsx` | Added maintenance/repair routes |
| `web/src/config/navigation.ts` | Added sidebar links |
| `web/e2e/maintenance-repairs.spec.ts` | Playwright headed UI tests |

## Local Verification Results

| Check | Result | Exit code |
|-------|--------|-----------|
| `npm run backend:lint` | PASS | 0 |
| `npm run backend:build` | PASS | 0 |
| `npm run web:lint` | PASS | 0 |
| `npm run web:build` | PASS | 0 |
| `npm --prefix backend run test:api-docs` | 86/86 PASS | 0 |
| `npm --prefix backend run test:trips` | 79/79 PASS | 0 |
| `npm --prefix backend run test:fuel-expenses` | 18/18 PASS | 0 |
| `npx ts-node scripts/maintenance-repair-workflow-test.ts` | 25/25 PASS | 0 |
| `npx playwright test --headed` (web) | 35/35 PASS | 0 |
| Vercel deploy | NOT RUN | — |

## Status Transition Rules

**Maintenance:** DRAFT → SUBMITTED → APPROVED → IN_PROGRESS → COMPLETED
Side transitions: any editable status → CANCELLED; SUBMITTED → REJECTED

**Repair:** DRAFT → SCHEDULED → IN_PROGRESS → COMPLETED
Side transitions: DRAFT → CANCELLED

## Security

- Every mutation endpoint requires auth + specific permission
- View endpoints require `_view` permission
- Audit logs written for all mutations
- Zod validation on all inputs
- Business rules enforced (vehicle existence, transition validation, cost constraints)

## Git Hygiene

- `.env` files: NOT tracked
- `.vercel` files: NOT tracked
- Test artifacts: NOT tracked
- Secrets: NOT printed

## PR #16 Merge Status

PR #16 (Phase 5 Deployment Gate Review) was merged into `main` at commit `fcad767e2becf108958d61c79e4b0050f18294b4`.
Branch protection is configured on `main`. PR #15 was rebased on `main` at commit `15b35b3`.

## Fixes Applied

- Fixed `MaintenanceDetailPage.tsx` and `RepairDetailPage.tsx`: changed `limit: 200` to `limit: 100`
  to match backend vehicle list validation (max 100).

## Next Step

Push branch, confirm GitHub Actions passes, then open for review.
