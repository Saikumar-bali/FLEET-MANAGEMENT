# Branch Protection Required

## Main Branch Rules

1. **Require PR before merge** — no direct pushes to main
2. **Require status checks to pass** — all CI checks must be green
3. **Require branch up to date** — branch must be current before merge
4. **Block force pushes** — no force push to main
5. **CLI-AI must not push directly to main** — all changes via PR

## Required Status Checks

| Check | Job | Source |
|---|---|---|
| backend-build | backend | tsc compile |
| backend-api-docs | backend | test:api-docs (126 endpoints) |
| backend-account-scope | backend | test:account-scope (18 tests) |
| backend-access-smoke | backend | access:smoke (28 assertions) |
| backend-access-diagnose | backend | access:diagnose |
| backend-module-scope | backend | test:module-scope (15 sections) |
| backend-module-scope-api | backend | test:module-scope-api (16 API checks) |
| frontend-build | frontend | tsc + vite build |

## Phase Branch Policy

- Phase branches (`phase-*`) also require CI to pass
- PRs to main from phase branches must pass all checks
- Direct pushes to phase branches are allowed for development
- Phase branch PRs to main are the merge gate

## CI Workflow

File: `.github/workflows/ci.yml`

Triggers:
- `push` to main or `phase-*`
- `pull_request` to main or `phase-*`
- `workflow_dispatch` (manual)

Jobs:
- `backend`: PostgreSQL service, full backend checks
- `frontend`: Web build verification
