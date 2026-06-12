# Local Testing Guide — Phase 4.8

## Prerequisites

- Node.js 18+ installed
- PostgreSQL database configured in `backend/.env`
- All dependencies installed (`npm install` in root, backend, and web)

## Credentials

All tests read credentials from `backend/.env`. Never print, commit, or share credential values.

### Required

- `E2E_ADMIN_IDENTIFIER` or `ADMIN_USERNAME` or `ADMIN_EMAIL`
- `E2E_ADMIN_PASSWORD` or `ADMIN_PASSWORD`

### Optional (for role-based permission checks)

Seeded roles match `backend/src/constants/rbac.ts` exactly:

- super_admin
- admin
- manager
- supervisor
- driver
- assistant_driver
- collector
- mechanic
- finance
- viewer

Set any subset; missing roles produce visible SKIP tests unless `E2E_REQUIRE_ALL_ROLES=true`.

- `E2E_ADMIN_IDENTIFIER` / `E2E_ADMIN_PASSWORD` — already required above
- `E2E_SUPER_ADMIN_IDENTIFIER` / `E2E_SUPER_ADMIN_PASSWORD`
- `E2E_MANAGER_IDENTIFIER` / `E2E_MANAGER_PASSWORD` or `MANAGER_USERNAME` / `MANAGER_PASSWORD`
- `E2E_SUPERVISOR_IDENTIFIER` / `E2E_SUPERVISOR_PASSWORD` or `SUPERVISOR_USERNAME` / `SUPERVISOR_PASSWORD`
- `E2E_DRIVER_IDENTIFIER` / `E2E_DRIVER_PASSWORD` or `DRIVER_USERNAME` / `DRIVER_PASSWORD`
- `E2E_ASSISTANT_DRIVER_IDENTIFIER` / `E2E_ASSISTANT_DRIVER_PASSWORD`
- `E2E_COLLECTOR_IDENTIFIER` / `E2E_COLLECTOR_PASSWORD`
- `E2E_MECHANIC_IDENTIFIER` / `E2E_MECHANIC_PASSWORD`
- `E2E_FINANCE_IDENTIFIER` / `E2E_FINANCE_PASSWORD` or `FINANCE_USERNAME` / `FINANCE_PASSWORD`
- `E2E_VIEWER_IDENTIFIER` / `E2E_VIEWER_PASSWORD` or `VIEWER_USERNAME` / `VIEWER_PASSWORD`

### Require all roles

- `E2E_REQUIRE_ALL_ROLES=true` — fails instead of skipping when role credentials are missing

## Terminal Setup

### Terminal 1 — Backend

```bash
cd backend
npm run dev
```

Backend runs on `http://localhost:4000`.

### Terminal 2 — Frontend

```bash
cd web
npm run dev
```

Web runs on `http://localhost:5173` and proxies `/api` to `localhost:4000`.

### Terminal 3 — Backend API Tests

```bash
cd backend
$env:API_BASE_URL="http://localhost:4000"
npm run test:trips
```

### Terminal 4 — Playwright UI Tests

```bash
cd web
$env:API_BASE_URL="http://localhost:4000"
npm run test:e2e
```

## Required Local Execution Order

CLI-AI must not mark completion based on assumptions. Every command must actually be run and exit 0.

1. `npm run backend:lint`
2. `npm run backend:build` (includes `prisma generate && tsc`)
3. `npm run web:lint`
4. `npm run web:build`
5. Start backend locally (`cd backend && npm run dev`)
6. `npm --prefix backend run test:trips`
7. Start web locally (`cd web && npm run dev`)
8. `npm --prefix web run test:e2e`

**Backend build is required before Playwright.** Playwright imports compiled RBAC from `backend/dist/src/constants/rbac.js`. If `npm run backend:build` fails, Playwright will fail with a clear error.

If any command is NOT RUN or FAIL, Phase 4 remains blocked.

## What the API Test Covers (25+ core + 10 role suites)

Role permissions are imported directly from `defaultRolePermissionMap` in `backend/src/constants/rbac.ts`. No hand-copied maps.

### Core workflow
- Health check
- Admin login
- Unauthorized request returns 401
- Create trip with TEST-E2E vehicle and driver
- List trips
- Get trip by ID
- Schedule trip (DRAFT → SCHEDULED)
- Start trip (SCHEDULED → STARTED)
- Vehicle status becomes ON_TRIP
- Driver status becomes ON_TRIP
- Second trip with same vehicle blocked (400)
- Complete trip (STARTED → COMPLETED)
- Vehicle status returns to AVAILABLE
- Driver status returns to AVAILABLE
- Trip history contains CREATED/SCHEDULED/STARTED/COMPLETED
- Cancel a trip
- Cancelled trip history exists
- Invalid status query returns 400
- Invalid tripType query returns 400

### Negative checks
- Start trip with UNDER_MAINTENANCE vehicle blocked (400)
- Start trip with SUSPENDED driver blocked (400)
- driver === assistantDriver rejected (400)
- Negative startOdometer rejected (400)
- endOdometer < startOdometer rejected (400)

### Role-based permission checks (10 seeded roles)
Role permissions imported directly from `defaultRolePermissionMap` in `rbac.ts`:
- **super_admin**: all trip permissions
- **admin**: all trip permissions
- **manager**: all trip permissions
- **supervisor**: all trip permissions
- **driver**: trip_view, trip_start, trip_end
- **assistant_driver**: trip_view only
- **collector**: no trip permissions
- **mechanic**: no trip permissions
- **finance**: no trip permissions
- **viewer**: trip_view only

### Credential semantics
- Wrong credentials (login fails): FAIL
- Missing optional role credentials: SKIP
- `E2E_REQUIRE_ALL_ROLES=true`: missing credentials produce FAIL instead of SKIP

### Cleanup
- All TEST-E2E vehicles reset to AVAILABLE
- All TEST-E2E drivers reset to AVAILABLE
- All started TEST-E2E trips cancelled
- Cleanup runs in finally block even on failure

## What the Playwright Test Covers

- **Self-contained admin lifecycle**: creates TEST-E2E vehicle/driver/trip in try block, cleans up in finally block
- **Asserts tripNumber starts with TEST-E2E**: `expect(trip.tripNumber).toMatch(/^TEST-E2E/)`
- **Asserts page title contains exact trip number**: `expect(page.locator('.page-header-title')).toContainText(trip.tripNumber)`
- Login as admin
- /trips page loads with Create Trip button
- Full lifecycle: schedule → start → complete via UI
- **Strict button assertions**: every button is checked with `await expect(locator).toBeVisible()` before clicking
- History tab shows CREATED, SCHEDULED, STARTED, COMPLETED
- No horizontal overflow at 1366x768
- Low-density layout (13px root font)
- Roles page still works
- Users page Create User button visible
- Role-based UI checks for all 10 seeded roles using exact RBAC:
  - Role permissions derived from `seededRoleKeys` in `rbac.ts` (no hardcoded list)
  - Roles with trip_view can see /trips page
  - Roles without trip_view get access denied
  - Roles with trip_create see Create Trip button
  - Roles without trip_create do not see Create Trip button
- Wrong credentials = FAIL (not SKIP)
- Missing optional role credentials = SKIP (unless `E2E_REQUIRE_ALL_ROLES=true`)

### TEST-E2E safety
- Vehicle/driver/trip created via API inside each test's try block
- Playwright never selects first option, first row, or real records
- Navigation uses stored trip ID directly
- Cleanup in finally block: cancel started trips, reset vehicles/drivers

## Important Notes

- **Do not deploy to Vercel during phase implementation.**
- Deploy to Vercel only after local API + Playwright tests pass and phase is reviewed.
- Do not commit `backend/.env` or any secrets.
- Do not modify mobile app files.
- Failing tests must exit with non-zero code.
- All test data uses `TEST-E2E-` prefixed records only.
- No real vehicle/driver records are used or deleted.
- Playwright fails if TEST-E2E record is missing (no fallbacks).
- Shared credential helpers duplicated in backend/web because they run in different processes.
- Seeded roles are exactly the roles from `backend/src/constants/rbac.ts`.
- Role permissions are derived from `defaultRolePermissionMap` in `rbac.ts` — no hardcoded maps in tests.
- Playwright loads `rbac.ts` via compiled `dist/src/constants/rbac.js` at runtime.
- No credential values are written in docs or printed during tests.
- **Backend build is required before Playwright** — `web/e2e/helpers/rbac.ts` throws a clear error if `backend/dist/src/constants/rbac.js` is missing. Run `npm run backend:build` first.
- **CLI-AI must not mark completion based on assumptions** — must actually run all commands and report actual results.
- **Required local execution order**: `backend:lint` → `backend:build` → `web:lint` → `web:build` → start backend → `test:trips` → start web → `test:e2e` (all must run and pass).
- **API base URL**: both `E2E_API_BASE_URL` and `API_BASE_URL` are supported; default is `http://localhost:4000`.
- **If prisma generate fails during backend build, backend build is FAIL.** Do not call it pass because tsc passed.
- **If any command is NOT RUN or FAIL, Phase 4 remains blocked.**
- **Wrong credentials are FAIL.** Missing optional role credentials are SKIP unless `E2E_REQUIRE_ALL_ROLES=true`.
- **Vercel deploy happens only after local QA is accepted.**
