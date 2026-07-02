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
- `a0bc643` — docs: Phase 2 hardening evidence - self-access endpoints, Playwright 2/2 PASS

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
- Uses deterministic PHASE_ACCESS_UI_TEST_USER only — never selects real users or fallback
- Uses API for mutations (override/scope), UI for verification
- Cleanup deletes only PHASE_ACCESS_UI_TEST-prefixed overrides and scopes (safe cleanup)
- No silent skip — throws on missing credentials
- Tests: ALLOW override, DENY override, scope grant/remove, Activity tab exact actions, My Access page with Hidden Menus
- Activity tab verified exact admin.user.permission.allow, admin.user.permission.deny, admin.user.scope.grant, admin.user.scope.remove
- My Access page verifies Hidden Menus section and Phase 3 disclaimer
- DENY override verified not in Final effective list (exact regex match to avoid fuel_view_own false positive)
- Backend activity metadata search fixed: `$queryRaw` LIKE wildcards now work via `$queryRawUnsafe` with SQL string concatenation
- Both tests pass

## Phase 2 Safety Hardening (current session)

### Playwright deterministic test user
- Test uses PHASE_ACCESS_UI_TEST_USER exclusively
- No fallback to random driver or users[1]
- Creates test user via API if missing; resets password if exists
- Test never mutates real users

### Safe cleanup
- Only overrides with reason starting with PHASE_ACCESS_UI_TEST are deleted
- Only scopes with reason starting with PHASE_ACCESS_UI_TEST or scopeId = phase2-vehicle-test are deleted
- Final cleanup also removes test-prefixed scopes after activity verification

### Hardcoded password removed
- Test password comes from env only: E2E_ACCESS_TEST_PASSWORD or CI_ACCESS_TEST_PASSWORD
- Test user identifier from env: E2E_ACCESS_TEST_IDENTIFIER or CI_ACCESS_TEST_IDENTIFIER
- No fallback password, no password in code, no password in docs

### Test-user mutation guarded
- E2E_ALLOW_TEST_USER_MUTATION=true required to create or reset PHASE_ACCESS_UI_TEST_USER
- If not set, test fails with clear message telling operator to create test user manually
- Remote API bases require E2E_ALLOW_REMOTE_TEST_MUTATION=true (disposable staging only)

### Activity tab exact verification
- Verifies all four admin.user.* actions: permission.allow, permission.deny, scope.grant, scope.remove
- Activity metadata search uses `$queryRawUnsafe` with SQL concatenation for correct LIKE wildcards

### DENY-proof assertion
- Uses exact regex `/^fuel_view$/` on individual `<div>` elements to avoid false positive from fuel_view_own

### My Access page
- Verifies all 7 sections: My Account, My Role, My Effective Permissions, My Data Scopes, Recent Activity, My Visible Menus, Hidden Menus
- Verifies Phase 3 disclaimer text
- Properly clears session before test user login

## Final Evidence Results (current session)
- Backend build: **PASS** (prisma generate EPERM on Windows — tsc --noEmit clean)
- Web build: **PASS**
- API docs: **PASS** (126/126)
- Account-scope test: **PASS** (18/18)
- Access smoke: **PASS** (28/28 assertions)
- Access diagnose: **PASS** (15 users)
- Playwright headed: **PASS** (2/2 tests)
- Hardcoded test password removed: **YES**
- Env-only test password: **YES**
- Test-user mutation guarded: **YES**
- Remote mutation guarded: **YES**
- Deterministic test user only: **YES**
- No real user override deletion: **YES**
- Cleanup limited to PHASE_ACCESS_UI_TEST artifacts: **YES**
- Activity exact actions verified: **YES**
- My Access works without user_view: **YES**
- Phase 3 still pending: **YES**
- Full E2E: NO
- Deploy: NO
- Full reseed: NO
