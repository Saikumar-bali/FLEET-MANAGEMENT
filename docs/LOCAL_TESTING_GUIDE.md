# Local Testing Guide — Phase 4.2

## Prerequisites

- Node.js 18+ installed
- PostgreSQL database configured in `backend/.env`
- All dependencies installed (`npm install` in root, backend, and web)

## Credentials

All tests read credentials from `backend/.env`. Required variables:

```
E2E_ADMIN_IDENTIFIER=admin
E2E_ADMIN_PASSWORD=admin@123
```

Or fallback chain: `ADMIN_USERNAME` → `ADMIN_EMAIL` and `ADMIN_PASSWORD`.

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

## What the API Test Covers (25 checks)

- Health check
- Admin login
- Unauthorized request returns 401
- Create trip with vehicle and driver
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
- Start trip with UNDER_MAINTENANCE vehicle blocked (400)
- Start trip with SUSPENDED driver blocked (400)
- driver === assistantDriver rejected (400)
- Negative startOdometer rejected (400)
- endOdometer < startOdometer rejected (400)
- Exit code: 0 = all pass, 1 = any fail

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

## Important Notes

- **Do not deploy to Vercel during phase implementation.**
- Deploy to Vercel only after local API + Playwright tests pass and phase is reviewed.
- Do not commit secrets or environment files.
- Do not modify mobile app files.
- Failing tests must exit with non-zero code.
