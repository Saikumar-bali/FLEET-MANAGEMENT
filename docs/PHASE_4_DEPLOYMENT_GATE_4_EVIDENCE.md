# Phase 4 Deployment Gate 4 Evidence

## Deployment Status

- **Gate Status:** PASS
- **Branch:** `phase-4-deployment-gate-4-build-redeploy-smoke`
- **Commit Tested:** `be959e293832e18acc4d5549f678bf5115068d34` (started from)
- **Backend Staging URL:** `https://fleet-management-backend-staging.vercel.app`
- **Web Staging URL:** `https://fleet-management-web-staging.vercel.app`
- **Swagger UI URL:** `https://fleet-management-backend-staging.vercel.app/api/v1/docs`
- **OpenAPI JSON URL:** `https://fleet-management-backend-staging.vercel.app/api/v1/docs/openapi.json`

## Local Verification Table

| Command | Result | Exit Code | Notes |
|---|---|---|---|
| `npm run backend:lint` | PASS | 0 | |
| `npm run backend:build` | PASS | 0 | Resolved EPERM by killing file-locking node processes |
| `npm run web:lint` | PASS | 0 | |
| `npm run web:build` | PASS | 0 | |
| `npm --prefix backend run test:api-docs` | PASS | 0 | 66 passed |
| `npm --prefix backend run test:trips` | PASS | 0 | 79 passed |
| `npm --prefix web run test:e2e` | PASS | 0 | 31 passed |

## Vercel Deployment Table

| Project | Result | Method | Notes |
|---|---|---|---|
| Backend | PASS | Vercel CLI | Redeployed with `bcryptjs` and `binaryTargets` |
| Web | NOT RUN | - | Backend URL and web code unchanged |

## Staging API Smoke Result

- **Result:** PASS
- **Total Tests:** 22
- **Passed:** 22
- **Failed:** 0
- **Skipped:** 0
- **Lifecycle verified:** Create, Schedule, Start, Complete, History, Cancel (all PASS)

## Swagger Live Coverage Result

- **Result:** PASS
- **API Groups:** 10/10 (Health, Auth, Users, Roles, Permissions, Vehicles, Drivers, Assets, Documents, Trips)
- **Required Endpoints:** All present and verified via live OpenAPI JSON

## Endpoint Testing Summary

- **PASS:** 40
- **FAIL:** 0
- **SKIP:** 13 (Safety-skipped mutation tests on staging, verified locally)
- **NOT RUN:** 0

## Role Coverage Report

| Role | Trip View | Trip Create | Trip Update | Trip Start | Trip End | Trip Cancel |
|---|---|---|---|---|---|---|
| `admin` | Yes | Yes | Yes | Yes | Yes | Yes |
| `super_admin` | Yes | Yes | Yes | Yes | Yes | Yes |
| `manager` | Yes | Yes | Yes | Yes | Yes | Yes |
| `supervisor` | Yes | Yes | Yes | Yes | Yes | Yes |
| `driver` | Yes | No | No | Yes | Yes | No |
| `assistant_driver` | Yes | No | No | No | No | No |
| `collector` | No | No | No | No | No | No |
| `mechanic` | No | No | No | No | No | No |
| `finance` | No | No | No | No | No | No |
| `viewer` | Yes | No | No | No | No | No |

## Confirmations

- [x] No direct push to main
- [x] No merge to main
- [x] No secrets printed
- [x] No Vercel env values printed
- [x] No production database used (Staging Neon used)
- [x] No Phase 5 work started
- [x] No mobile changes
- [x] `.vercel` files not tracked
