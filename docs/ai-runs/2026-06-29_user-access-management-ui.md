# Phase 2: User Access Management UI

## Date
2026-06-29

## Branch
`phase-account-scope-foundation`

## Commits
- `bbe5026` — fix: harden permission classifier, audit entityType, controller validation, OpenAPI aliases, service smoke tests
- `624aaf2` — fix: audit entityId now points to actual record IDs (override/scope)
- `c13cf77` — feat: user access management UI (Phase 2)
- `96b2bb8` — fix: activity metadata search, resilient MyAccess scopes, stable e2e test
- `953aba1` — feat: Phase 2 hardening - self-access endpoints, users summary, activity fix, stable e2e

## Status
Phase 1 backend foundation: Complete.
Phase 2 user access UI: Complete (hardened).
Module-level scope enforcement: Pending (Phase 3).

## Phase 2 Hardening (953aba1)

### Backend: Self-access endpoints (no user_view required)
- `GET /api/v1/access/me/effective-permissions` — uses `req.authUser.id`
- `GET /api/v1/access/me/data-scopes` — uses `req.authUser.id`
- `GET /api/v1/access/me/activity` — uses `req.authUser.id`
- `GET /api/v1/access/me/summary` — returns user, role, permissions, scopes, activity

### Backend: Users access summary
- `GET /api/v1/access/users/summary` — requires `user_view`
- Returns per-user counts: effectivePermissionsCount, dataScopesCount, overridesCount, recentActivityAction, recentActivityAt

### Backend: Activity endpoint fix
- `GET /api/v1/access/users/:id/activity` now also queries `metadata.actorUserId`
- Four-way OR: `userId`, `entityId`, `metadata.targetUserId`, `metadata.actorUserId`

### Frontend: MyAccessPage
- Uses self-access endpoint (`/access/me/summary`) exclusively
- No longer calls `/access/users/:id/data-scopes`
- Shows: account, role, effective permissions, data scopes, recent activity, visible/hidden menus
- Hidden menus show missing permissions
- Shows disclaimer: "Scope-based menu checks are pending Phase 3."

### Frontend: UsersPage
- Added columns: Perms count, Scopes count, Overrides count, Recent activity
- Uses `getUsersAccessSummary` API helper

### Frontend: UserDetailPage
- After override/scope changes, activity tab data refreshes
- Shows GLOBAL/MANAGE super_admin-only warning in Data Scopes tab
- Activity tab shows actor/target from metadata

### Frontend: API service layer
- Added: `getMyDataScopes`, `getMyActivity`, `getMyAccessSummary`, `getUsersAccessSummary`
- `getMyEffectivePermissions` now uses `/access/me/effective-permissions`

### OpenAPI
- Added 6 new endpoints to spec: `/access/me/*` (4), `/access/users/summary`, `/access/users/{id}/activity`

### Playwright test
- Uses API for mutations (override/scope), UI for verification
- No silent skip — throws on missing credentials
- Tests: ALLOW override, DENY override, scope grant/remove, Activity tab, My Access page
- Both tests pass

## Final Evidence Results (953aba1)
- Backend build: **PASS**
- Web build: **PASS**
- API docs: **PASS** (126/126)
- Account-scope test: **PASS** (18/18)
- Access smoke: **PASS** (28/28 assertions)
- Access diagnose: **PASS** (18 users)
- Playwright headed: **PASS** (2/2 tests)
- My Access self endpoints: **YES**
- My Access works without user_view: **YES**
- Activity query includes metadata.targetUserId: **YES**
- Activity query includes metadata.actorUserId: **YES**
- Users access summary counts: **YES**
- Playwright no silent skip: **YES**
- Full E2E: NO
- Deploy: NO
- Full reseed: NO
