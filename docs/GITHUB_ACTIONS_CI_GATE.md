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

## Required GitHub Secrets

Configure these repository or environment secrets before requiring the CI gate:

- `CI_JWT_SECRET`
- `CI_SUPER_ADMIN_IDENTIFIER`, `CI_SUPER_ADMIN_PASSWORD`
- `CI_ADMIN_IDENTIFIER`, `CI_ADMIN_PASSWORD`
- `CI_MANAGER_IDENTIFIER`, `CI_MANAGER_PASSWORD`
- `CI_SUPERVISOR_IDENTIFIER`, `CI_SUPERVISOR_PASSWORD`
- `CI_DRIVER_IDENTIFIER`, `CI_DRIVER_PASSWORD`
- `CI_ASSISTANT_DRIVER_IDENTIFIER`, `CI_ASSISTANT_DRIVER_PASSWORD`
- `CI_COLLECTOR_IDENTIFIER`, `CI_COLLECTOR_PASSWORD`
- `CI_MECHANIC_IDENTIFIER`, `CI_MECHANIC_PASSWORD`
- `CI_FINANCE_IDENTIFIER`, `CI_FINANCE_PASSWORD`
- `CI_VIEWER_IDENTIFIER`, `CI_VIEWER_PASSWORD`

Use unique CI-only username identifiers and strong CI-only passwords. Do not use
local, staging, or production credentials.

`CI_DATABASE_URL` is also a required CI environment name, but the workflow sets
it to the temporary PostgreSQL service container rather than storing a shared
database URL as a secret.

## Local Development

Local CLI-AI and developer test runs may read credentials from `backend/.env`.
That file must never be committed or printed. Credential helpers prefer `CI_*`
environment variables when present and otherwise retain the existing local
`.env` behavior.

## Secret Safety

- Never print or commit secrets.
- Never upload backend or Playwright logs that may contain sensitive values.
- Never point pull-request CI at staging or production databases.
- Never add Vercel deployment credentials or deployment commands to this workflow.

