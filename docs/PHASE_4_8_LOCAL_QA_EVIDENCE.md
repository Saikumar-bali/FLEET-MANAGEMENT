# Phase 4.8 — Local QA Evidence

## Metadata

- **Commit SHA tested**: `6e4eaa9` (Phase 4.7 on main)
- **Date/time**: 2026-06-12 17:41 UTC
- **Local backend URL**: `http://localhost:4000`
- **Local web URL**: `http://localhost:5173`
- **E2E_REQUIRE_ALL_ROLES**: false (unset)

## Role Coverage Report

All 10 seeded roles from `backend/src/constants/rbac.ts`:

- super_admin: found
- admin: found
- manager: found
- supervisor: found
- driver: found
- assistant_driver: found
- collector: found
- mechanic: found
- finance: found
- viewer: found

No `ops_admin` (not in `roleDefinitions`, not seeded).

## Commands Executed

### 1. npm run backend:lint

- **Status**: PASS
- **Exit code**: 0
- **Output**: `tsc --noEmit` — no errors

### 2. npm run backend:build

- **Status**: FAIL
- **Exit code**: 1
- **Output**: `prisma generate && tsc` — `prisma generate` fails with `EPERM: operation not permitted, rename query_engine-windows.dll.node`
- **Note**: This is a known Windows file-locking issue with the Prisma engine DLL. The `tsc` step would pass, but `prisma generate` fails first, so the build command exits 1.
- **Impact**: Phase 4 remains blocked. Backend build is a required command.

### 3. npm run web:lint

- **Status**: PASS
- **Exit code**: 0
- **Output**: `tsc --noEmit` — no errors

### 4. npm run web:build

- **Status**: PASS
- **Exit code**: 0
- **Output**: `tsc -b && vite build` — 64 modules transformed, built in 2.05s

### 5. npm run test:trips (backend API)

- **Status**: PASS
- **Exit code**: 0
- **Result**: 79 passed, 0 failed, 0 skipped
- **Core workflow**: 29 checks (health, login, CRUD, lifecycle, vehicle/driver status, conflict, history, cancel, query validation)
- **Negative checks**: 5 checks (maintenance vehicle, suspended driver, same driver/assistant, negative odometer, odometer regression)
- **Role-based checks**: 10 roles x 4 checks each = 40 checks (trip_view, trip_create, trip_start, trip_cancel)
- **All TEST-E2E records**: vehicles, drivers, trips created and cleaned up in finally block

### 6. npm run test:e2e (Playwright)

- **Status**: PASS
- **Exit code**: 0
- **trips.spec.ts**: 27 passed, 0 failed
- **ui-regression.spec.ts**: 4 passed, 0 failed
- **Total**: 31 passed, 0 failed

## Manual Checks

- `/trips`: PASS — Create Trip button visible as admin
- `/trips/:id`: PASS — Self-contained lifecycle test creates trip, navigates by ID, schedules, starts, completes, verifies history
- `/roles`: PASS — Permission matrix table visible, Save Permissions visible
- `/users`: PASS — Create User button visible

## Safety Confirmations

- **No credentials printed**: CONFIRMED — no password values, JWT secrets, database URLs, or tokens appear in test output or docs
- **No secrets committed**: CONFIRMED — `backend/.env` is not in tracked files
- **No Vercel deployment**: CONFIRMED — no `vercel deploy` or `vercel push` commands executed
- **No mobile changes**: CONFIRMED — no files under `mobile/` directory modified
- **Playwright touched only TEST-E2E records**: CONFIRMED — all vehicles created with `TEST-E2E-E2E-V-` prefix, drivers with `TEST-E2E-E2E-D-` prefix, trips via API helper with TEST-E2E data
- **Backend API test touched only TEST-E2E records**: CONFIRMED — all vehicles created with `TEST-E2E-TRIP-VEH-` prefix, drivers with `TEST-E2E-TRIP-DRV-` prefix, cleanup in finally block
- **Wrong credentials fail**: CONFIRMED — `loginAsRole` returns false, test throws Error
- **Missing optional credentials skip**: CONFIRMED — `test.skip()` called when `E2E_REQUIRE_ALL_ROLES` is not true
- **Playwright admin lifecycle is self-contained**: CONFIRMED — creates own vehicle/driver/trip in try block, cleans up in finally block, no dependency on other tests
- **Role iteration uses RBAC source**: CONFIRMED — `seededRoleKeys` from `web/e2e/helpers/rbac.ts` (loaded from compiled `rbac.js`), no hardcoded `allRoleKeys` list

## Blocker

**Phase 4 remains blocked.** `npm run backend:build` fails (exit 1) due to Windows EPERM on `prisma generate`. This is a known Windows file-locking issue, not a code issue. The compiled `dist/src/constants/rbac.js` exists from a previous build, so Playwright and the API test can run. However, the build command itself fails, which means Phase 4 cannot move forward until this is resolved.

Possible resolutions:
1. Stop all Node processes holding the Prisma engine DLL, then retry
2. Run `prisma generate` separately before `tsc`
3. Accept that this is a Windows-specific environment issue, not a code issue
