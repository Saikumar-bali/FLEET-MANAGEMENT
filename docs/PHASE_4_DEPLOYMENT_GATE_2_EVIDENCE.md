# Phase 4 Deployment Gate 2 Evidence

## Metadata

- Branch name: `phase-4-deployment-gate-2-vercel-env-swagger`
- Reviewed commit carried forward: `7dceb4bab18c0d693b1caad59fefbc7bc85472b9`
- Tested branch head: `201a57013903d2186a64b169d630f19bff4ccecc`
- Backend staging URL: `https://fleet-management-backend-staging.vercel.app`
- Web staging URL: `https://fleet-management-web-staging.vercel.app`
- Swagger UI URL: `https://fleet-management-backend-staging.vercel.app/api/v1/docs`
- OpenAPI JSON URL: `https://fleet-management-backend-staging.vercel.app/api/v1/docs/openapi.json`
- E2E role coverage source: seeded roles from RBAC

## `.vercel` Tracking Result

- `git ls-files backend/.vercel web/.vercel`: no tracked files found
- `.gitignore` still contains `.vercel/`
- Local Vercel link files were used for deployment only and remain untracked

## Files Changed In This Gate

- `backend/src/docs/openapi.ts`
- `web/src/config/api.ts`
- `web/playwright.config.ts`
- `web/e2e/trips.spec.ts`
- `docs/API_ENDPOINT_TESTING_PHASE_4.md`
- `docs/PHASE_4_DEPLOYMENT_GATE_2_EVIDENCE.md`
- `docs/ai-runs/2026-06-13_phase-4-deployment-gate-2-vercel-env-swagger.md`
- `docs/STAGING_VERIFICATION.md`
- `progress.md`

## Local Verification

| Command | Result | Exit code | Notes |
|---|---|---:|---|
| `npm run backend:lint` | PASS | 0 | TypeScript no-emit check passed |
| `npm run backend:build` | PASS | 0 | `prisma generate && tsc` passed after clearing Prisma DLL lock |
| `npm run web:lint` | PASS | 0 | TypeScript no-emit check passed |
| `npm run web:build` | PASS | 0 | Vite production build passed |
| `$env:API_BASE_URL='http://localhost:4000'; npm --prefix backend run test:trips` | PASS | 0 | `79 passed, 0 failed, 0 skipped` |
| `$env:API_BASE_URL='http://localhost:4000'; npm --prefix web run test:e2e` | PASS | 0 | `31 passed, 0 failed, 0 skipped` |

## Role Coverage Report

- `super_admin`
- `admin`
- `manager`
- `supervisor`
- `driver`
- `assistant_driver`
- `collector`
- `mechanic`
- `finance`
- `viewer`

## Vercel Env Setup

### Backend staging project

- Found before update: `NODE_ENV` only, plus Vercel system keys
- Added or refreshed:
  - `NODE_ENV`
  - `DATABASE_URL`
  - `DIRECT_URL`
  - `JWT_SECRET`
  - `JWT_EXPIRES_IN`
  - `JWT_REFRESH_EXPIRES_IN`
  - `CORS_ORIGIN`
  - `ADMIN_EMAIL`
  - `ADMIN_USERNAME`
  - `ADMIN_PASSWORD`
  - `UPLOAD_DIR`
  - `MAX_FILE_SIZE`
  - `ENABLE_DEMO_USERS`

### Web staging project

- Added or refreshed:
  - `VITE_API_URL`

No Vercel env values were printed or committed.

## Prisma / Neon Result

| Command | Result | Exit code | Notes |
|---|---|---:|---|
| `npm --prefix backend run prisma:db:push` | PASS | 0 | Neon schema already in sync |
| `npm --prefix backend run prisma:seed` | PASS | 0 | Seed executed successfully against staging Neon |

Neon verification:

- backend staging login and protected queries succeeded against the deployed backend
- `/api/v1/health` returned `database: connected`
- no production database was used

## Vercel Deployment Result

| Project | Result | Exit code | URL |
|---|---|---:|---|
| Backend `fleet-management-backend-staging` | PASS | 0 | `https://fleet-management-backend-staging.vercel.app` |
| Web `fleet-management-web-staging` | PASS | 0 | `https://fleet-management-web-staging.vercel.app` |

## Staging Backend Smoke

| Check | Result | Notes |
|---|---|---|
| `GET /api/v1/health` | PASS | `success: true`, `database: connected` |
| `GET /api/v1/docs` | PASS | Swagger UI route returned `200` |
| `GET /api/v1/docs/openapi.json` | PASS | valid OpenAPI JSON returned |
| `POST /api/v1/auth/login` | PASS | admin login succeeded without printing tokens |
| `GET /api/v1/auth/me` | PASS | user and permission payload returned |
| `GET /api/v1/trips` | PASS | authorized request succeeded |
| `GET /api/v1/vehicles` | PASS | authorized request succeeded |
| `GET /api/v1/drivers` | PASS | authorized request succeeded |
| `GET /api/v1/roles` | PASS | authorized request succeeded |
| `GET /api/v1/users` | PASS | authorized request succeeded |
| `GET /api/v1/permissions` | PASS | authorized request succeeded |
| `GET /api/v1/users` without token | PASS | denied with `401` |
| `npm run smoke:test` against staging | PASS | `5 passed, 0 failed` |

## Swagger / OpenAPI Coverage

- Swagger UI served successfully from `/api/v1/docs`
- OpenAPI JSON served successfully from `/api/v1/docs/openapi.json`
- Confirmed groups:
  - `Health`
  - `Auth`
  - `Users`
  - `Roles`
  - `Permissions`
  - `Vehicles`
  - `Drivers`
  - `Assets`
  - `Documents`
  - `Trips`
- Confirmed trip paths:
  - `GET /trips`
  - `POST /trips`
  - `GET /trips/{id}`
  - `PATCH /trips/{id}`
  - `POST /trips/{id}/schedule`
  - `POST /trips/{id}/start`
  - `POST /trips/{id}/complete`
  - `POST /trips/{id}/cancel`
  - `GET /trips/{id}/history`

## Staging Web Smoke

| Check | Result | Notes |
|---|---|---|
| Login page load | PASS | deployed page loaded from staging URL |
| Admin login | PASS | succeeded through Playwright |
| Dashboard | PASS | loaded after login |
| `/trips` | PASS | admin and all seeded-role expectations verified |
| `/roles` | PASS | permission matrix loaded |
| `/users` | PASS | user management page loaded |
| `/vehicles` | PASS | detail layout verified in Playwright UI regression |
| `/drivers` | PASS | backend authorized API check passed |
| `/assets` | PASS | route available in deployed shell; no blank page observed in staging suite |
| Web -> backend target | PASS | deployed web used staging backend base, not localhost |

Playwright staging result:

- `31 passed, 0 failed, 0 skipped`

## Confirmations

- No direct push to `main`
- No merge to `main`
- No secrets printed
- No Vercel env values printed
- No production database used
- No Phase 5 work started
- No mobile files changed

## Outcome

Phase 4 Deployment Gate 2 is submitted for review. Phase 5 is still not started.
