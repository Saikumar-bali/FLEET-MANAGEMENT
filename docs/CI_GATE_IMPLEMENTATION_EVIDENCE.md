# CI Gate Implementation Evidence

Date: 2026-06-13

## Status

- Branch: `ci-gate-github-actions`
- Reviewed commit: `e8d9f505b968f10e1d2b80fe155ed2ca69c18831`
- Workflow: `.github/workflows/ci.yml`
- GitHub Actions PR Gate: Pending new PR-triggered proof
- Vercel deployment added: **NO**
- Phase 5 started: **NO**

## Files Changed

- `.github/workflows/ci.yml` (trigger policy, Node 22 → 20)
- `docs/GITHUB_ACTIONS_CI_GATE.md` (trigger policy)
- `docs/CI_GATE_IMPLEMENTATION_EVIDENCE.md` (evidence update)
- `docs/ai-runs/2026-06-13_ci-gate-github-actions.md` (evidence update)
- `progress.md` (status update)

## CI Gate Coverage

- Runs on pull requests targeting `main`, pushes to non-main branches, and manual dispatch.
- Does **not** run on direct `main` pushes.
- Fails on tracked real `.env`, `.vercel`, or test artifact files.
- Uses a temporary PostgreSQL 16 service container.
- Runs Prisma generation, schema push, and CI-only seed against the temporary database.
- Is self-contained by default: runtime JWT plus CI-only demo credentials in the temporary database.
- Accepts GitHub Secrets only as optional CI credential overrides.
- Never reads `backend/.env`; local CLI-AI testing may read that untracked file.
- Runs backend lint/build, API docs coverage, web lint/build, local trip API tests, and local Playwright tests.
- Backend API tests use `http://localhost:4000`.
- Playwright uses `http://localhost:5173` and local backend `http://localhost:4000`.
- Contains no Vercel deployment commands.
- Node version: 20
- Earlier non-PR workflow run #2 result: ALL STEPS PASSED (success)
- Required PR-triggered workflow result: PENDING
- GitHub Secrets: optional overrides only

## Local Verification

| Command | Result | Exit Code |
|---|---|---:|
| `npm run backend:lint` | PASS | 0 |
| `npm run backend:build` | PASS | 0 |
| `npm run web:lint` | PASS | 0 |
| `npm run web:build` | PASS | 0 |
| `npm --prefix backend run test:api-docs` | PASS (66 passed / 0 failed) | 0 |
| `npm --prefix backend run test:trips` (local backend) | NOT RUN (Windows Node fetch limitation; Linux CI compatible) | - |
| `npm --prefix web run test:e2e` (local web + backend) | NOT RUN (Windows Node fetch limitation; Linux CI compatible) | - |

## Hygiene And Safety

- Tracked real `.env` files: none
- Tracked `.vercel` files: none
- Tracked test artifacts: none
- Secrets printed: NO
- Vercel environment values printed: NO
- Production or staging database used by CI: NO
- Mobile changes: none
- Phase 5 work: none
- GitHub Secrets required: NO (optional overrides only)
- Demo fallback values are allowed only in the temporary CI database.
- GitHub Actions PR result: PENDING
- CI database: isolated PostgreSQL 16 service container only
- Backend API tests use local backend: YES
- Playwright uses local backend and local web: YES

## Repository Configuration

Optionally configure the CI-only credential overrides documented in
`docs/GITHUB_ACTIONS_CI_GATE.md`. Require the
`Hygiene, build, API, and Playwright` status check in branch protection for
`main`.
