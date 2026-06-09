# Deployment Guide

## Deployment Rule

Use Vercel and Neon for testing/staging. Do not deploy production until the complete staging verification checklist passes. Phase 1 must not begin until this foundation is clean.

## Environments

| Environment | Purpose |
|---|---|
| Local | Developer machine |
| Staging | Vercel deployments connected to a Neon staging database |
| Production | Live users, created only after staging passes |

## Neon PostgreSQL Setup

1. Create a Neon project and a dedicated staging database/branch.
2. Copy the pooled connection string into `DATABASE_URL`. The hostname normally includes `-pooler`.
3. Copy the direct, non-pooled connection string into `DIRECT_URL`.
4. Keep `sslmode=require` in both connection strings.
5. Add both variables to the Vercel backend project. Never commit either value.
6. From `backend/`, generate Prisma Client and apply committed migrations:

```bash
npm install
npm run prisma:generate
npm run prisma:migrate:deploy
```

The current Phase 0.5 Prisma schema establishes the connection foundation only. Business models and their migrations belong to later approved phases.

## Vercel CLI Setup

Install and authenticate the CLI:

```bash
npm install -g vercel
vercel login
```

Link and deploy each project from its own root directory:

```bash
cd backend
vercel link
vercel

cd ../web
vercel link
vercel
```

Use `vercel env add VARIABLE_NAME preview` to add staging variables, or configure them in the Vercel dashboard. Use `vercel env pull .env.local` only for local development and never commit the downloaded file.

## Backend Vercel Project

Settings:

| Setting | Value |
|---|---|
| Root Directory | `backend` |
| Build Command | `npm run build` |
| Output Directory | Not required for API |

Required deployed environment variables:

- `DATABASE_URL`: pooled Neon application connection
- `DIRECT_URL`: direct Neon migration connection
- `JWT_SECRET`: random secret of at least 32 characters
- `JWT_EXPIRES_IN`: access-token TTL, for example `15m`
- `JWT_REFRESH_EXPIRES_IN`: refresh-token TTL, for example `7d`
- `CORS_ORIGIN`: deployed web URL, for example `https://fleet-staging.example.com`
- `NODE_ENV`: `staging` for staging
- `ADMIN_EMAIL`: seed email for the super admin user
- `ADMIN_PASSWORD`: seed password for the super admin user

The serverless entry is `backend/api/index.ts`. It exports the Express app without calling `app.listen`. `backend/src/server.ts` remains the local development entry.

## Web Vercel Project

Settings:

| Setting | Value |
|---|---|
| Root Directory | `web` |
| Build Command | `npm run build` |
| Output Directory | `dist` |

Required environment variable:

- `VITE_API_URL`: deployed backend origin without `/api/v1`, for example `https://fleet-api-staging.example.com`

The Vite proxy remains available for local development. Deployed API requests use `VITE_API_URL`.

## Staging Deployment Flow

1. Create and configure the Neon staging database.
2. Configure all backend Vercel preview/staging variables.
3. From the repository root, run the build checks and then from `backend/` run the Prisma commands:

```bash
npm install
npm run backend:build
npm run web:build

cd backend
npx prisma generate
npx prisma db push
npx prisma db seed
```

4. Deploy the backend and verify `GET /api/v1/health`.
5. Confirm the health response reports `"database": "connected"`.
6. Set web `VITE_API_URL` to the deployed backend origin.
7. Deploy the web project.
8. Verify the web app can call the deployed backend.
9. Record the staging result in `progress.md`.

## Environment Checklist

Backend:

- [ ] `PORT` configured locally when a non-default port is needed
- [ ] `NODE_ENV` is `staging` or `production` when deployed
- [ ] `DATABASE_URL` is the pooled Neon URL
- [ ] `DIRECT_URL` is the direct Neon URL
- [ ] `JWT_SECRET` is random and at least 32 characters
- [ ] `JWT_EXPIRES_IN` reviewed
- [ ] `JWT_REFRESH_EXPIRES_IN` reviewed
- [ ] `CORS_ORIGIN` exactly matches the web origin
- [ ] `ADMIN_EMAIL` is configured for seeding
- [ ] `ADMIN_PASSWORD` is configured for seeding
- [ ] `UPLOAD_DIR` reviewed
- [ ] `MAX_FILE_SIZE` reviewed

Web:

- [ ] `VITE_API_URL` points to the deployed backend origin

## Verification Checklist

- [x] `npm run backend:lint`
- [x] `npm run backend:build`
- [x] `npm run web:lint`
- [x] `npm run web:build`
- [x] Local `GET /api/v1/health` works
- [x] Neon `prisma db push` works with pooled `DATABASE_URL` and direct `DIRECT_URL`
- [x] Neon `prisma db seed` works with env-driven `ADMIN_EMAIL` and `ADMIN_PASSWORD`
- [x] Auth API verification completed locally:
  - super admin login: pass
  - `/api/v1/auth/me`: pass
  - `/api/v1/roles`: pass
  - `/api/v1/permissions`: pass
  - `/api/v1/users`: pass
  - request without token: `401`
  - request without permission: `403`
  - super admin critical-permission removal blocked: `400`
- [ ] Staging `GET /api/v1/health` reports database connected
- [x] No secrets are committed
- [ ] Production deployment remains blocked until staging passes

## Verification Proof

### 2026-06-09 local plus Neon verification

- Prisma generate result: success.
- Prisma push result: Neon schema sync succeeded after using the Prisma-safe pooled URL for `DATABASE_URL` and the unpooled URL for `DIRECT_URL`.
- Prisma seed result: success.
- Current seeded database baseline after cleanup of temporary verification records:
  - roles: `10`
  - permissions: `51`
  - role-permission mappings: `182`
  - users: `1` env-driven super admin
- Auth proof:
  - `POST /api/v1/auth/login` succeeded for the seeded super admin
  - `GET /api/v1/auth/me` returned the current user and 51 permissions
  - `GET /api/v1/roles` succeeded with `role_view`
  - `GET /api/v1/permissions` succeeded with `permission_view`
  - `GET /api/v1/users` succeeded with `user_view`
  - `GET /api/v1/permissions` without a token returned `401`
  - a no-permission verification user received `403` on `GET /api/v1/users`
  - `PATCH /api/v1/roles/:id/permissions` returned `400` when critical permissions were removed from `super_admin`
- User-management proof:
  - `POST /api/v1/users` succeeded
  - `PATCH /api/v1/users/:id` succeeded
  - `PATCH /api/v1/users/:id/status` succeeded
  - `PATCH /api/v1/users/:id/password` succeeded
  - temporary verification user and temporary verification role were removed after the checks
- Remaining gap: staging deployment verification on Vercel is still pending.
