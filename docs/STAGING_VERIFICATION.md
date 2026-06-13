# Staging Verification

## Rule

Use Vercel for backend and web staging, Neon PostgreSQL for the staging database, and keep production blocked until all staging checks pass.

## Backend Vercel Project Settings

| Setting | Value |
|---|---|
| Root Directory | `backend` |
| Build Command | `npm run build` |
| Output Directory | Not required |
| Install Command | `npm install` |

## Web Vercel Project Settings

| Setting | Value |
|---|---|
| Root Directory | `web` |
| Build Command | `npm run build` |
| Output Directory | `dist` |
| Install Command | `npm install` |

## Neon Connection Rules

- `DATABASE_URL` must use the pooled Neon connection string for app traffic.
- `DIRECT_URL` must use the direct, non-pooled Neon connection string for Prisma schema operations.
- Keep `sslmode=require` enabled in both connection strings.
- Never commit live Neon values.

## Required Backend Environment Variables

- `NODE_ENV=staging`
- `DATABASE_URL`
- `DIRECT_URL`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `JWT_REFRESH_EXPIRES_IN`
- `CORS_ORIGIN`
- `ADMIN_EMAIL`
- `ADMIN_USERNAME`
- `ADMIN_PASSWORD`
- `ENABLE_DEMO_USERS` for local/staging demo only, never production
- `UPLOAD_DIR`
- `MAX_FILE_SIZE`

## Demo User Safety Rule

- Demo users are allowed only for local or staging demo use.
- Keep `ENABLE_DEMO_USERS=false` in committed env examples.
- If `NODE_ENV=production` and `ENABLE_DEMO_USERS=true`, backend startup and Prisma seed must fail with a clear error.

## Required Web Environment Variables

- `VITE_API_URL`

## Backend Deployment Commands

```bash
cd backend
vercel link
vercel env add NODE_ENV production
vercel env add DATABASE_URL production
vercel env add DIRECT_URL production
vercel env add JWT_SECRET production
vercel env add JWT_EXPIRES_IN production
vercel env add JWT_REFRESH_EXPIRES_IN production
vercel env add CORS_ORIGIN production
vercel env add ADMIN_EMAIL production
vercel env add ADMIN_USERNAME production
vercel env add ADMIN_PASSWORD production
vercel env add ENABLE_DEMO_USERS production
vercel env add UPLOAD_DIR production
vercel env add MAX_FILE_SIZE production
vercel --prod --yes
```

## Web Deployment Commands

```bash
cd web
vercel link
vercel env add VITE_API_URL production
vercel --prod --yes
```

## Prisma Commands

Run these from `backend/` after setting the Neon environment locally:

```bash
npx prisma generate
npx prisma db push
npx prisma db seed
```

## Health URL Format

```text
https://<backend-staging-domain>/api/v1/health
```

## Expected Health Response

```json
{
  "success": true,
  "message": "Operation successful",
  "data": {
    "status": "ok",
    "timestamp": "2026-06-09T00:00:00.000Z",
    "uptime": 12.34,
    "database": "connected"
  }
}
```

## Manual Auth Verification

1. Open the backend health URL and confirm `database` is `connected`.
2. Open the deployed web app URL.
3. Sign in with the seeded super admin using username `admin` or the configured admin email.
4. Confirm the dashboard loads without API errors.
5. Confirm roles page loads and lists roles.
6. Confirm users page loads and lists users.
7. Confirm an authenticated request to `/api/v1/auth/me` succeeds.
8. Confirm an unauthenticated request to `/api/v1/permissions` returns `401`.

## Smoke Test Command

Run this from `backend/` after the backend preview URL is known:

```bash
API_BASE_URL=https://<backend-staging-domain> ADMIN_USERNAME=<admin-username> ADMIN_PASSWORD=<admin-password> npm run smoke:test
```

On PowerShell:

```powershell
$env:API_BASE_URL='https://<backend-staging-domain>'
$env:ADMIN_USERNAME='<admin-username>'
$env:ADMIN_PASSWORD='<admin-password>'
npm run smoke:test
```

## Rollback Notes

- Do not promote anything to production until backend health, login, `/auth/me`, `/roles`, and `/users` pass on staging.
- If a backend preview deployment fails, redeploy the previous known-good backend commit before updating `VITE_API_URL`.
- If a web preview deployment fails, keep the previous preview active and do not change `CORS_ORIGIN`.
- If Neon schema changes cause breakage, restore the last known-good schema state before retrying deployment.

## CLI TLS Note

If the Vercel CLI fails on this machine with `unable to verify the first certificate`, run it with the system CA store enabled:

```powershell
$env:NODE_OPTIONS='--use-system-ca'
vercel whoami
```

## 2026-06-09 Live Staging Verification

- Backend staging URL: `https://fleet-management-backend-staging.vercel.app`
- Web staging URL: `https://fleet-management-web-staging.vercel.app`
- Backend health verification: pass, `database: connected`
- Remote smoke test verification: pass
- Deployed web login verification: pass

## 2026-06-10 Phase 2.2 Verification

- Prisma generate: pass
- Prisma db push against Neon staging: pass, database already in sync
- Prisma seed against Neon staging: pass
- Database verification:
  - `users.username` column exists
  - super admin username is `admin`
  - demo users exist in staging Neon for `opsadmin`, `manager`, `supervisor`, `driver`, `assistantdriver`, `collector`, `mechanic`, `finance`, `viewer`
- Production demo-user guard verification:
  - backend startup config import fails when `NODE_ENV=production` and `ENABLE_DEMO_USERS=true`
  - Prisma seed fails when `NODE_ENV=production` and `ENABLE_DEMO_USERS=true`
- Backend API verification against staging backend:
  - login with username `admin`: pass
  - login with email `admin@fleet.local`: pass
  - `GET /api/v1/auth/me`: pass
  - `GET /api/v1/users`: pass
  - `POST /api/v1/users`: pass
  - `PATCH /api/v1/users/:id`: pass
  - `PATCH /api/v1/users/:id/password`: pass
  - duplicate username returns clean `400`
  - duplicate email returns clean `400`
  - `passwordHash` is not returned in tested API responses
- Frontend staging acceptance:
  - admin username login: pass
  - Users page create button visible: pass
  - create user from UI: pass
  - new user appears immediately in list: pass
  - duplicate create shows clean error: pass
  - edit user: pass
  - password reset: pass
  - Roles page load: pass
- Enterprise density acceptance:
  - deployed root font size verified at `13px`
  - deployed sidebar width verified at `228px`
  - deployed cards and topbar spacing verified as compact and readable

## 2026-06-13 Phase 4 Deployment Gate 5

- Gate status: PASS
- Backend staging URL: `https://fleet-management-backend-staging.vercel.app`
- Web staging URL: `https://fleet-management-web-staging.vercel.app`
- Swagger UI URL: `https://fleet-management-backend-staging.vercel.app/api/v1/docs`
- OpenAPI JSON URL: `https://fleet-management-backend-staging.vercel.app/api/v1/docs/openapi.json`
- Backend health verification: PASS, `database: connected` (exit 0)
- Auth smoke result: PASS (identifier login, /auth/me)
- Trip smoke result: PASS (full lifecycle: create, schedule, start, complete, cancel, history)
- Cancel proof: Verified live on staging via `POST /trips/:id/cancel` with dedicated test trip. Status correctly transitioned to `CANCELLED`.
- Swagger coverage result: PASS (all 10 groups, 53 endpoints documented)
- Staging API smoke result: PASS (23 tests passed, 0 failed)
- Vercel deployment result: PASS (backend and web redeployed to fix commit status failure)
- Hygiene check: PASS (vite-log.txt, web/test-results, and .vercel files removed from Git tracking and gitignored)
- Note: All staging records use `TEST-E2E-STAGING-API-` prefix for safe identification.

## 2026-06-13 Phase 4 Gate 7

- Backend staging URL: `https://fleet-management-backend-staging.vercel.app`
- Web staging URL: `https://fleet-management-web-staging.vercel.app`
- Backend and web existing-project prebuilt production deployments: PASS
- Root URL staging smoke: PASS, 25 passed / 0 failed / 0 skipped
- `/api/v1` URL staging smoke: PASS, 25 passed / 0 failed / 0 skipped
- URL normalization: PASS; both formats route through exactly one `/api/v1`
- Cancel proof: PASS; second test trip cancelled and cancel history returned 200
- Swagger UI and OpenAPI JSON: PASS
- Live Swagger coverage: 10 tags / 40 paths / 54 operations
- Wrong root `web` project's Git integration: disconnected via Vercel CLI
- Phase 5: not started
