# Phase 4 Deployment Gate Evidence

## Metadata

- Branch name: `phase-4-deployment-gate`
- Base commit deployed: `437a1f2895a1930791b7742487b7e6ce67861080`
- Backend staging URL: latest existing staging deployment observed was `https://fleet-management-backend-staging-iy7uo1ld7.vercel.app`
- Web staging URL: latest existing staging deployment observed was `https://fleet-management-web-staging-4f0tceqf9.vercel.app`
- Local backend URL used: `http://localhost:4000`
- Local web URL used: `http://localhost:5173`
- E2E_REQUIRE_ALL_ROLES: false

## Role Coverage Report

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

No credential values were printed.

## Local Command Results

| Command | Status | Exit code | Safe summary |
|---|---:|---:|---|
| `npm run backend:lint` | PASS | 0 | TypeScript no-emit check passed. |
| `npm run backend:build` | PASS | 0 | Fresh `prisma generate && tsc` completed successfully. |
| `npm run web:lint` | PASS | 0 | TypeScript no-emit check passed. |
| `npm run web:build` | PASS | 0 | TypeScript and Vite build passed; 64 modules transformed. |
| `cd backend && npm run dev` | PASS | n/a | Local backend started and served requests on `http://localhost:4000`. |
| `$env:API_BASE_URL="http://localhost:4000"; npm --prefix backend run test:trips` | PASS | 0 | 79 passed, 0 failed, 0 skipped. |
| `cd web && npm run dev` | PASS | n/a | Local web started and served requests on `http://localhost:5173`. |
| `$env:API_BASE_URL="http://localhost:4000"; npm --prefix web run test:e2e` | PASS | 0 | 31 passed, 0 failed, 0 skipped. |

## Vercel Pre-Deploy Environment Check

Existing staging projects were relinked successfully:

- `fleet-management-backend-staging`
- `fleet-management-web-staging`

Required environment-variable presence check:

- Backend staging required envs: FAIL (`NODE_ENV`, `DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `JWT_REFRESH_EXPIRES_IN`, `CORS_ORIGIN`, `ADMIN_EMAIL`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `UPLOAD_DIR`, `MAX_FILE_SIZE` were not present)
- Web staging required envs: FAIL (`VITE_API_URL` was not present)

Because the staging environment inventory failed, deployment did not proceed.

## Vercel Deployment Results

| Step | Result | Notes |
|---|---|---|
| Backend deploy | NOT RUN | Blocked before deployment because required staging env vars were missing. |
| Web deploy | NOT RUN | Blocked before deployment because required staging env vars were missing. |

## Staging Smoke Results

| Check | Result | Notes |
|---|---|---|
| Backend health | NOT RUN | No deployment performed in this gate. |
| Backend auth/me | NOT RUN | No deployment performed in this gate. |
| Trips list | NOT RUN | No deployment performed in this gate. |
| Web login | NOT RUN | No deployment performed in this gate. |
| `/trips` page | NOT RUN | No deployment performed in this gate. |
| `/roles` page | NOT RUN | No deployment performed in this gate. |
| `/users` page | NOT RUN | No deployment performed in this gate. |

## Test Totals

- Backend API test: 79 passed, 0 failed, 0 skipped
- Playwright: 31 passed, 0 failed, 0 skipped

## Confirmations

- No secrets printed: confirmed
- No Vercel env values printed: confirmed
- No production database used: confirmed for this gate because no staging deployment or staging smoke was executed; the missing staging env inventory prevented any database-targeted deploy step
- No mobile changes: confirmed
- No direct push to `main`: confirmed
- No Phase 5 work started: confirmed

## Outcome

Phase 4 Deployment Gate blocked before deployment because the linked staging Vercel projects do not currently have the required environment variables configured. Local QA passed, but deployment and staging smoke were not allowed to proceed.
