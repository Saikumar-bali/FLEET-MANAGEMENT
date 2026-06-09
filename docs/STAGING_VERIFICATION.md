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
- `ADMIN_PASSWORD`
- `UPLOAD_DIR`
- `MAX_FILE_SIZE`

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
vercel env add ADMIN_PASSWORD production
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
3. Sign in with the seeded super admin from `ADMIN_EMAIL` and `ADMIN_PASSWORD`.
4. Confirm the dashboard loads without API errors.
5. Confirm roles page loads and lists roles.
6. Confirm users page loads and lists users.
7. Confirm an authenticated request to `/api/v1/auth/me` succeeds.
8. Confirm an unauthenticated request to `/api/v1/permissions` returns `401`.

## Smoke Test Command

Run this from `backend/` after the backend preview URL is known:

```bash
API_BASE_URL=https://<backend-staging-domain> ADMIN_EMAIL=<admin-email> ADMIN_PASSWORD=<admin-password> npm run smoke:test
```

On PowerShell:

```powershell
$env:API_BASE_URL='https://<backend-staging-domain>'
$env:ADMIN_EMAIL='<admin-email>'
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
