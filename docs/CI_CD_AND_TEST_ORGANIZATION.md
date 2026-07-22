# CI/CD and Test Organization

## Branch motive

`agent/finance-ledger-e2e` turns finance from loosely connected records into an auditable ledger-backed workflow.

It adds:

- staff wallets and allocations for drivers, mechanics, collectors, and other staff
- trip allowance funding with both reuse-existing-balance and preserve-existing-balance modes
- expense, fuel, reimbursement, return, carry-forward, reversal, and settlement posting
- double-entry journals, payment allocations, reconciliation, idempotency, and maker-checker-cashier controls
- finance UI for staff cash and advances
- backend finance scenarios and Playwright UI coverage

The branch CI already validates the finance flow against PostgreSQL 16 and runs the new staff-finance API and browser scenarios.

## CI/CD flow

The repository uses two top-level workflows:

1. `.github/workflows/ci.yml`
   - runs for pull requests to `main`, `agent/**`, phase branches, and `main`
   - validates backend, web, mobile, dependencies, CodeQL, integration tests, and Playwright
   - exposes one required quality gate
   - synchronizes the sanitized backend to the partner repository only after a successful `main` quality gate

2. `.github/workflows/deploy-vercel.yml`
   - does not deploy pull requests
   - runs only after `CI, Security and Backend Sync` succeeds on `main`, or by a manual run from `main`
   - applies committed Prisma migrations before backend deployment
   - deploys the backend first and checks `/api/v1/health`
   - deploys the web only after backend health passes
   - checks `/` and `/login`

This keeps testing and deployment separate. A failed test cannot deploy.

## Required GitHub environment and secrets

Create a GitHub Environment named `staging`. Add protection/approval rules when required.

Add these secrets to the `staging` environment or repository:

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_BACKEND_PROJECT_ID`
- `VERCEL_WEB_PROJECT_ID`
- `DEPLOY_DATABASE_URL`
- `DEPLOY_DIRECT_URL`

`DEPLOY_DATABASE_URL` should be the pooled application URL. `DEPLOY_DIRECT_URL` should be the direct migration URL. Both must point to the non-production database until staging is accepted.

The remaining runtime secrets, such as JWT, storage, mail, and CORS values, belong in the corresponding Vercel project environment and must not be committed.

## Vercel monorepo configuration

The failed PR deployment reported no project root directory even though the frontend output is `web/dist`.

The repository now supports both configurations:

- repository-root Vercel project: root `vercel.json` builds `web` and publishes `web/dist`
- web-root Vercel project: `web/vercel.json` builds and publishes `dist`

Recommended Vercel dashboard settings for the web project:

- Root Directory: `web`
- Framework Preset: Vite
- Build Command: `npm run build`
- Output Directory: `dist`

Recommended backend project settings:

- Root Directory: `backend`
- Framework Preset: Other
- Build configuration: `backend/vercel.json`

After GitHub Actions deployment is working, choose one deployment owner:

- Actions-owned deployment: disconnect Vercel Git auto-deployments to avoid duplicate builds
- Vercel-owned previews plus Actions-owned `main`: keep preview Git deployments, but ensure the web Root Directory is `web`

Do not keep two separate production deployments triggering from the same `main` commit.

## Can workflow files be kept in folders?

No. GitHub only loads workflow files placed directly under:

```text
.github/workflows/*.yml
```

Nested workflow folders such as `.github/workflows/tests/backend.yml` are not discovered.

Use a small number of workflow entry files and organize the implementation elsewhere.

Recommended structure:

```text
.github/
  workflows/
    ci.yml
    deploy-vercel.yml
    scheduled-security.yml
  actions/
    setup-backend/action.yml
    setup-web/action.yml
  scripts/
    verify-git-hygiene.sh
    wait-for-backend.sh
backend/
  scripts/
    tests/
      finance/
      trips/
      driver-portal/
      rbac/
web/
  e2e/
    finance/
    trips/
    auth/
```

## Preventing too many future workflow runs

Use these controls:

- one PR CI orchestrator instead of one workflow per test
- jobs grouped by backend, web, mobile, security, and end-to-end tests
- package scripts such as `test:finance` that call test files from domain folders
- reusable composite actions under `.github/actions`
- `paths` or `paths-ignore` only for expensive independent workflows
- job-level `if` conditions for domain-specific suites
- concurrency with `cancel-in-progress: true` for pull-request CI
- one final required quality gate in branch protection
- deployment triggered from successful `main` CI, not directly from every push

Avoid creating a separate workflow for every test case. That creates excessive runs, repeated dependency installation, noisy required checks, and harder branch protection.

## Recommended next refactor

Keep the current green CI behavior unchanged first. In a separate PR:

1. move backend test scripts into domain folders
2. keep compatibility package scripts so existing commands do not break
3. extract repeated setup steps into `.github/actions`
4. split scheduled security scanning only if it does not need to block every PR
5. retain a single `Required quality gate` status for branch protection
