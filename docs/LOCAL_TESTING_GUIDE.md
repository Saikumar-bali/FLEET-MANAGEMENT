# Local Testing Guide — Phase 4.3

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

- `E2E_VIEWER_IDENTIFIER` / `E2E_VIEWER_PASSWORD` or `VIEWER_USERNAME` / `VIEWER_PASSWORD`
- `E2E_DRIVER_IDENTIFIER` / `E2E_DRIVER_PASSWORD` or `DRIVER_USERNAME` / `DRIVER_PASSWORD`
- `E2E_MANAGER_IDENTIFIER` / `E2E_MANAGER_PASSWORD` or `MANAGER_USERNAME` / `MANAGER_PASSWORD`
- `E2E_SUPERVISOR_IDENTIFIER` / `E2E_SUPERVISOR_PASSWORD` or `SUPERVISOR_USERNAME` / `SUPERVISOR_PASSWORD`
- `E2E_FINANCE_IDENTIFIER` / `E2E_FINANCE_PASSWORD` or `FINANCE_USERNAME` / `FINANCE_PASSWORD`

If optional role credentials are absent, those role tests are skipped with a clear message.

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

## What the API Test Covers (28+ checks)

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

### Role-based permission checks
- Viewer can GET /trips, cannot POST /trips or start
- Driver cannot create or cancel trips
- Manager can create and list trips

### Cleanup
- All TEST-E2E vehicles reset to AVAILABLE
- All TEST-E2E drivers reset to AVAILABLE
- All started TEST-E2E trips cancelled
- Cleanup runs in finally block even on failure

## What the Playwright Test Covers

- Login as admin
- /trips page loads with Create Trip button
- Create trip from /trips/new
- Schedule and start trip from detail page
- History tab shows lifecycle records
- No horizontal overflow at 1366x768
- Low-density layout (13px root font)
- Roles page still works
- Users page Create User button visible
- Viewer cannot see Create Trip button (if viewer credentials exist)
- Driver cannot see Create Trip button (if driver credentials exist)

## Important Notes

- **Do not deploy to Vercel during phase implementation.**
- Deploy to Vercel only after local API + Playwright tests pass and phase is reviewed.
- Do not commit `backend/.env` or any secrets.
- Do not modify mobile app files.
- Failing tests must exit with non-zero code.
- All test data uses `TEST-E2E-` prefixed records only.
- No real vehicle/driver records are used or deleted.
