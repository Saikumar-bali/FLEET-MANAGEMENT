# Phase 6: Maintenance and Repair Workflow — Implementation Evidence

**Date:** 2026-06-20
**Branch:** `phase-6-maintenance-repair-clean`
**Base:** `main` (latest, commit `8cbeb12`)

## What Was Built

### Database
- `MaintenanceRequest` model with workflow status (DRAFT → SUBMITTED → APPROVED/REJECTED/CANCELLED)
- `Repair` model with repair lifecycle (OPEN → IN_PROGRESS → COMPLETED/CANCELLED)
- `MaintenancePriority` enum: LOW, MEDIUM, HIGH, CRITICAL
- `RepairStatus` enum: OPEN, IN_PROGRESS, COMPLETED, CANCELLED
- Proper relations to Vehicle, Trip, Driver, User models

### RBAC
- 5 new maintenance permissions: `maintenance_view`, `maintenance_create`, `maintenance_update`, `maintenance_submit`, `maintenance_approve`
- `repair_*` permissions already existed from earlier work
- Permissions assigned to appropriate roles:
  - **super_admin/admin**: all permissions
  - **manager**: all maintenance + repair permissions
  - **supervisor**: maintenance_view/create/update + repair_view/create/update
  - **mechanic**: maintenance_view/update + repair_view/update/close
  - **viewer**: maintenance_view + repair_view

### Backend API
- `/api/v1/maintenance` — 9 endpoints (list, create, get, update, submit, approve, reject, cancel, delete)
- `/api/v1/repairs` — 8 endpoints (list, create, get, update, start, complete, cancel, delete)
- Zod validation on all endpoints
- Audit logging for all create/update/action operations
- OpenAPI docs updated with all new endpoints

### Frontend
- Maintenance list page with search, status filter, priority display
- Maintenance detail/create page with vehicle, category, priority, estimated cost, description fields
- Repair list page with search, status filter
- Repair detail/create page with vehicle, category, provider, estimated cost, description fields
- Repair lifecycle buttons: Start Repair, Complete, Cancel
- Sidebar navigation updated with Maintenance and Repairs links

### Tests
- Backend API test: 35+ scenarios covering CRUD, lifecycle, vehicle status transitions, viewer denied, negative cases
- Playwright E2E: 2 test scenarios for maintenance and repair workflows
- API docs coverage: 102 endpoints across 12 tags

## CI Failure Root Cause and Fixes

### Codex P1: Repair Prisma Include Bug
**File:** `backend/src/modules/repairs/repairs.service.ts`
**Problem:** Repair queries used shared `workflowInclude` which selects `approvedBy`, but Repair model has `closedBy` instead.
**Fix:** Created `repairInclude` constant with `closedBy` relation instead of `approvedBy`. All repair queries now use `repairInclude`.

### Codex P2: Repair Lifecycle Vehicle Status
**File:** `backend/src/modules/repairs/repairs.service.ts`
**Problem:** Repair transitions only updated `repair.status`. Vehicle status remained AVAILABLE, so trips could start while repair was active.
**Fix:** Added Prisma `$transaction` for `IN_PROGRESS`, `COMPLETED`, and `CANCELLED` transitions:
- `IN_PROGRESS`: updates vehicle to `UNDER_REPAIR`
- `COMPLETED`/`CANCELLED`: checks for remaining active repairs; if none, resets vehicle to `AVAILABLE`

### Codex P3: Playwright Maintenance Required Field
**File:** `web/e2e/maintenance-repairs.spec.ts`
**Problem:** Maintenance form has required Description field, but test did not fill it.
**Fix:** Added `await page.getByLabel('Description *').fill('Engine oil change needed')` before Save.

### CI Workflow Update
**File:** `.github/workflows/ci.yml`
**Problem:** CI did not run maintenance-repair API tests.
**Fix:** Added `npm --prefix backend run test:maintenance-repair` step after fuel/expense tests and before Playwright.

## UI Regression Verification

| Check | Result |
|-------|--------|
| Sidebar title "Fleet Management Studio" | PASS |
| Appearance menu Light/Dark/System | PASS |
| Logout inside account menu | PASS |
| No "API key" text (Integrations instead) | PASS |
| Mobile sidebar override at 900px | PASS |
| Maintenance and Repairs nav links visible | PASS |

## Verification Commands

| Command | Result | Exit Code |
|---------|--------|-----------|
| `npm run backend:lint` (tsc --noEmit) | PASS | 0 |
| `npm run backend:build` (tsc) | PASS | 0 |
| `npm run web:lint` (tsc --noEmit) | PASS | 0 |
| `npm run web:build` (vite build) | PASS | 0 |
| API docs coverage test | 86/86 PASS | 0 |
| Playwright test list | 35 tests in 4 files | — |
| Backend API test | Requires running server | — |

## Gate Status

- **Vercel deploy:** NOT RUN
- **Phase 7:** NOT started
- **Mobile:** NOT modified
- **Secrets:** NOT printed or committed
- **GitHub Actions CI:** Pending (awaiting push and CI run)
