# Local Testing Guide — Phase 4.4

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

All 11 roles are supported. Set any subset; missing roles are skipped unless `E2E_REQUIRE_ALL_ROLES=true`.

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
- `E2E_OPS_ADMIN_IDENTIFIER` / `E2E_OPS_ADMIN_PASSWORD`

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
npm run test:e2e
```

## What the API Test Covers (25+ core + 11 role suites)

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

### Role-based permission checks (all 11 roles)
For each role, tests against `defaultRolePermissionMap` from `rbac.ts`:
- **super_admin**: all trip permissions
- **admin**: all except role_delete
- **manager**: all trip + vehicle + driver permissions
- **supervisor**: trip + vehicle + driver + asset permissions
- **driver**: trip_view, trip_start, trip_end only
- **assistant_driver**: trip_view only
- **collector**: finance_view, report_view only (no trip access)
- **mechanic**: repair_view, repair_update, repair_close only (no trip access)
- **finance**: finance/fuel/expense/report view + approve (no trip access)
- **viewer**: view-only permissions
- **ops_admin**: empty permissions (no access)

### SKIP semantics
- Missing role credentials produce SKIP, not FAIL
- `E2E_REQUIRE_ALL_ROLES=true` makes missing credentials fail instead

### Cleanup
- All TEST-E2E vehicles reset to AVAILABLE
- All TEST-E2E drivers reset to AVAILABLE
- All started TEST-E2E trips cancelled
- Cleanup runs in finally block even on failure

## What the Playwright Test Covers

- Login as admin
- /trips page loads with Create Trip button
- Create trip from /trips/new using TEST-E2E vehicle/driver via API
- Schedule and start trip from detail page (selects TEST-E2E row, not first row)
- History tab shows lifecycle records
- No horizontal overflow at 1366x768
- Low-density layout (13px root font)
- Roles page still works
- Users page Create User button visible
- Role-based UI checks for all 11 roles (skip if no credentials):
  - trips page loads correctly
  - Create Trip button visibility matches RBAC

### TEST-E2E UI data
- Vehicle/driver created via API before tests (never selects first row)
- Cleanup in afterAll: cancel started trips, reset vehicles/drivers

## Important Notes

- **Do not deploy to Vercel during phase implementation.**
- Deploy to Vercel only after local API + Playwright tests pass and phase is reviewed.
- Do not commit `backend/.env` or any secrets.
- Do not modify mobile app files.
- Failing tests must exit with non-zero code.
- All test data uses `TEST-E2E-` prefixed records only.
- No real vehicle/driver records are used or deleted.
- Playwright creates TEST-E2E records via API; never selects first available row.
- Shared credential helpers duplicated in backend/web because they run in different processes.
- Vercel staging projects `fleet-management-web-staging` and `fleet-management-backend-staging` have been deleted; only `web` and `backend` projects remain.
