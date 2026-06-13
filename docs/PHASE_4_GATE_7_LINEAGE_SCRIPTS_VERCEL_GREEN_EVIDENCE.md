# Phase 4 Gate 7: Lineage, Scripts, and Vercel Evidence

Date: 2026-06-13

## Status

- Branch: `phase-4-gate-7-lineage-scripts-vercel-green`
- Main base commit: `de3c77e2bfc49b0a367e0d207d651917130ea3ab`
- Phase 4 source branch: `phase-4-deployment-gate-5-final-cleanup-pr-gate`
- Phase 4 source commit merged: `6e27896a2d1a61c63fe5c5585323719a33935ad7`
- Lineage merge commit: `56bd081efa21eb3a5fa698d40e2a9c01c707469d`
- Correction commit first pushed for status verification: `2730a7a27dbca2bc7f03825925131ceb4a68620e`
- Final branch head: the branch-tip evidence-status commit; exact SHA is reported by `git rev-parse HEAD` and in the final run response
- Main status: unchanged; correction is branch-only
- Gate status at evidence write: submitted for final review with reviewer-acceptable clean status isolation
- Phase 5: not started

## Reproducible Scripts

- `backend/scripts/api-docs-coverage-test.ts`: verifies 10 tags, 54 Phase 4 operations, protected-route `bearerAuth`, and identifier/password login schema.
- `backend/scripts/staging-api-smoke-test.ts`: normalizes host-root and `/api/v1` inputs to exactly one `/api/v1`, uses `endpoint(...)`, and checks the complete create/schedule/start/complete/history plus create/cancel/history workflows.
- Required package scripts are present: `test:api-docs`, `test:staging-api`, and existing `test:trips`.

## Local Verification

| Command | Result | Exit |
|---|---|---:|
| `npm run backend:lint` | PASS | 0 |
| `npm run backend:build` | PASS after stopping one workspace Node process that held Prisma DLL; initial attempt failed with Windows `EPERM` | 0 final |
| `npm run web:lint` | PASS | 0 |
| `npm run web:build` | PASS | 0 |
| `npm --prefix backend run test:api-docs` | PASS, 66 passed / 0 failed | 0 |
| `npm run test:trips` from `backend` | PASS, 79 passed / 0 failed / 0 skipped | 0 |
| `npm run test:e2e` from `web` | PASS, 31 passed | 0 |

Role coverage names only: `super_admin`, `admin`, `manager`, `supervisor`, `driver`, `assistant_driver`, `collector`, `mechanic`, `finance`, `viewer`.

## Vercel Deployment

- Existing backend project: `fleet-management-backend-staging`
- Existing web project: `fleet-management-web-staging`
- Backend deploy: PASS, stable alias `https://fleet-management-backend-staging.vercel.app`
- Web deploy: PASS, stable alias `https://fleet-management-web-staging.vercel.app`
- Backend first prebuilt production deploy attempt: FAIL because the artifact was built for preview; rebuilt with `vercel build --prod`, then deployment passed.
- No new Vercel projects were created.
- Vercel environment values were not printed.

## Staging Verification

| Input `API_BASE_URL` | Result | Exit |
|---|---|---:|
| `https://fleet-management-backend-staging.vercel.app` | PASS, 25 passed / 0 failed / 0 skipped | 0 |
| `https://fleet-management-backend-staging.vercel.app/api/v1` | PASS, 25 passed / 0 failed / 0 skipped | 0 |

Cancel proof: the smoke test created a second `TEST-E2E-STAGING` trip, `POST /trips/:id/cancel` returned 200, and `GET /trips/:id/history` after cancel returned 200 in both URL-format runs.

## Swagger

- Swagger UI: `https://fleet-management-backend-staging.vercel.app/api/v1/docs`
- OpenAPI JSON: `https://fleet-management-backend-staging.vercel.app/api/v1/docs/openapi.json`
- Live coverage: PASS, 10 tags / 40 paths / 54 operations
- Missing required Phase 4 operations: none
- API docs coverage test: PASS, 66 passed / 0 failed

## GitHub and Vercel Status

- Original Gate 6 status: red.
- Root cause: GitHub status context `Vercel` failed from the separate root-level project `web`.
- Action: linked the existing wrong `web` project and ran `vercel git disconnect --yes`; CLI confirmed the repository was disconnected.
- Final pushed correction status: clean isolation with no status contexts and no GitHub workflow runs.
- Final status is not described as green because GitHub reported no Vercel status context after the wrong project was disconnected.

## Hygiene and Confirmations

- No direct push or merge to `main`.
- `.vercel` directories are ignored and not tracked.
- `vite-log.txt` and `web/test-results` are ignored and not tracked.
- No credentials, passwords, tokens, database URLs, full usernames, or Vercel environment values were recorded.
- Local credentials were read from `backend/.env`.
- No production database was used.
- No mobile files were changed.
- No Phase 5, fuel, expenses, maintenance, finance, GPS/maps, or Tally work was started.
