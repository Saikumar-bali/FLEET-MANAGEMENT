# CI Gate Implementation Evidence

## Date
2026-06-30

## Workflow File
`.github/workflows/ci.yml`

## Triggers
- Push to `main` or `phase-*`
- Pull request to `main` or `phase-*`
- `workflow_dispatch` (manual)

## Backend Job
PostgreSQL 16 service container.

Steps:
1. `npm install`
2. `npx prisma generate`
3. `npx prisma migrate deploy`
4. `npx prisma db seed`
5. `npm run lint`
6. `npm run test:api-docs` — 126 endpoint coverage
7. `npm run test:account-scope` — 18 permission/scope tests
8. `npm run access:smoke` — 28 assertion service tests
9. `npm run access:diagnose` — user/role/permission diagnostics
10. `npm run test:module-scope` — 15-section enforcement tests
11. Start backend server (port 4000, health check loop)
12. `npm run test:module-scope-api` — 16 HTTP API smoke checks

## Frontend Job
Steps:
1. `npm install`
2. `npm run build` — TypeScript + Vite production build

## Phase 15 Required Checks
- backend build/lint
- API docs coverage
- account-scope tests
- access service smoke
- access diagnostics
- module-scope enforcement tests
- module-scope API smoke tests
- frontend build

## Branch Protection
See `docs/BRANCH_PROTECTION_REQUIRED.md`
