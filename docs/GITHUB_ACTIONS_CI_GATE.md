# GitHub Actions CI Gate

## Responsibility

- CLI-AI writes and verifies code, but it is not the approver.
- GitHub Actions is the automatic pull-request gatekeeper.
- Branch protection should require the `Hygiene, build, API, and Playwright` check before merging to `main`.
- Vercel deployment remains manual after a phase is accepted. CI never deploys Vercel.
- Staging smoke remains a separate manual gate after phase completion.

## What CI Runs

The workflow at `.github/workflows/ci.yml` runs for pull requests targeting
`main`, pushes to non-main branches (`branches-ignore: main`), and manual
`workflow_dispatch` runs. It does **not** run on direct pushes to `main`.

It verifies:

- no tracked real `.env`, `.vercel`, or test artifact files
- backend dependency install, Prisma generation, lint, build, and API docs coverage
- web dependency install, lint, and build
- a temporary PostgreSQL service database created only for the workflow
- Prisma schema push and CI-only seed against that temporary database
- backend trip API tests against `http://localhost:4000`
- Playwright tests against local web and local backend

The workflow contains no Vercel deployment step.

## CI Database

GitHub Actions starts a PostgreSQL 16 service container for each workflow run.
`CI_DATABASE_URL`, `DATABASE_URL`, and `DIRECT_URL` point only to that temporary
database. CI must never use staging or production database URLs.

## CI Credentials

The CI gate is self-contained by default and does not require GitHub Secrets.
It generates a JWT secret and unique per-role passwords at runtime using
`openssl rand -hex 12`. CI-only identifiers (prefixed `ci-`) and passwords
never match local, staging, or production credentials. They exist only within
the disposable CI database created per workflow run.

### Super Admin

The super admin user is created by the Prisma seed using `ADMIN_USERNAME` and
`ADMIN_PASSWORD` (the seed itself reads these env vars, not `CI_SUPER_ADMIN_*`).
The CI workflow maps GitHub Secrets into those variables:

| GitHub Secret Name | Maps to env var | Used by seed as |
|---|---|---|
| `CI_SUPER_ADMIN_IDENTIFIER` | `ADMIN_USERNAME` | super admin login identifier |
| `CI_SUPER_ADMIN_PASSWORD` | `ADMIN_PASSWORD` | super admin password |

When no `CI_SUPER_ADMIN_*` secrets are configured, the workflow defaults
`ADMIN_USERNAME=admin` and generates a random `ADMIN_PASSWORD` at runtime.
Test credential helpers fall through from `CI_SUPER_ADMIN_IDENTIFIER` →
`ADMIN_USERNAME` and `CI_SUPER_ADMIN_PASSWORD` → `ADMIN_PASSWORD`, so the
super admin resolves correctly in all cases.

**Important:** `CI_SUPER_ADMIN_IDENTIFIER` and `CI_SUPER_ADMIN_PASSWORD` must
NOT be generated independently in the runtime credential loop. The seed creates
the super admin through `ADMIN_USERNAME`/`ADMIN_PASSWORD`, not through
CI_SUPER_ADMIN env vars. Setting them independently would create a mismatch
between the login identifier and the seed-created user.

### Demo Roles (admin, manager, supervisor, driver, etc.)

For all other roles, the workflow generates random passwords at runtime.
The seed's `ciDemoCredential()` function reads `CI_<ROLE>_IDENTIFIER` and
`CI_<ROLE>_PASSWORD` environment variables. When both are present (either
from GitHub Secrets or runtime generation), the seed creates a CI-only user
with those credentials. When either is missing, the seed falls back to default
demo credentials (safe only in the disposable CI database).

### Optional GitHub Secret Overrides

The following repository or environment secrets may optionally override the
runtime-generated CI credentials:

- `CI_JWT_SECRET`
- `CI_SUPER_ADMIN_IDENTIFIER`, `CI_SUPER_ADMIN_PASSWORD` (super admin — mapped into `ADMIN_USERNAME`/`ADMIN_PASSWORD` for the seed)
- `CI_ADMIN_IDENTIFIER`, `CI_ADMIN_PASSWORD`
- `CI_MANAGER_IDENTIFIER`, `CI_MANAGER_PASSWORD`
- `CI_SUPERVISOR_IDENTIFIER`, `CI_SUPERVISOR_PASSWORD`
- `CI_DRIVER_IDENTIFIER`, `CI_DRIVER_PASSWORD`
- `CI_ASSISTANT_DRIVER_IDENTIFIER`, `CI_ASSISTANT_DRIVER_PASSWORD`
- `CI_COLLECTOR_IDENTIFIER`, `CI_COLLECTOR_PASSWORD`
- `CI_MECHANIC_IDENTIFIER`, `CI_MECHANIC_PASSWORD`
- `CI_FINANCE_IDENTIFIER`, `CI_FINANCE_PASSWORD`
- `CI_VIEWER_IDENTIFIER`, `CI_VIEWER_PASSWORD`

When overrides are configured, use unique CI-only identifiers and strong
CI-only passwords. Do not use local, staging, or production credentials.

`CI_DATABASE_URL` is set by the workflow to the temporary PostgreSQL service
container. It is not read from GitHub Secrets or any shared database.

When GitHub Secrets are not configured, the workflow generates random
passwords at runtime. Previously hardcoded demo fallback passwords
(`admin@123`, `manager@123`, etc.) have been replaced with
`openssl rand -hex 12` generated values to eliminate any reuse risk.

## Local Development

Local CLI-AI and developer test runs may read credentials from `backend/.env`.
That file must never be committed or printed. Credential helpers prefer `CI_*`
environment variables when present and otherwise retain the existing local
`.env` behavior. GitHub Actions never reads `backend/.env`.

## Secret Safety

- Never print or commit secrets.
- Never upload backend or Playwright logs that may contain sensitive values.
- Never point pull-request CI at staging or production databases.
- Never add Vercel deployment credentials or deployment commands to this workflow.
