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

## Status
Phase 1 backend foundation: Complete.
Phase 2 user access UI: Complete.
Module-level scope enforcement: Pending (Phase 3).

## Changes
### Backend
- Added `GET /api/v1/users/:id/activity` endpoint in both primary and alias routes
- Activity searches audit logs where userId OR entityId OR metadata.targetUserId matches the target user
- Metadata search uses `string_contains` for `"targetUserId":"<id>"` pattern

### Frontend: API Layer
Added typed functions in `web/src/services/api.ts`:
- `getUserEffectivePermissions`
- `getUserPermissionOverrides`
- `setUserPermissionOverride`
- `removeUserPermissionOverride`
- `getUserDataScopes`
- `grantUserDataScope`
- `removeUserDataScope`
- `getUserActivity`
- `getMyEffectivePermissions`

### Frontend: Pages
- **UsersPage**: Added "Manage Access" button per row that navigates to `/users/:id`
- **UserDetailPage**: 8-tab page with Profile, Account, Role, Effective Permissions, Permission Overrides, Data Scopes, Activity, Menu Preview tabs
  - Effective Permissions: shows role perms, ALLOW overrides, DENY overrides, final effective list with DENY-win logic
  - Permission Overrides: search permissions, filter by module, add ALLOW/DENY with reason/expiry, remove
  - Data Scopes: grant/remove scopes with type, ID, access level, reason, expiry
  - Activity: timeline of audit logs
  - Menu Preview: visible/hidden menus with missing permission reasons
- **MyAccessPage**: Self-service diagnostics accessible to every logged-in user at `/my-access`
  - Shows account info, role, effective permissions, data scopes, visible menus, hidden menus with missing permission reasons
  - Data scopes loaded separately to handle users without `user_view` permission gracefully

### Frontend: Routing
- `/users/:id` — protected by `user_view`
- `/my-access` — accessible to all authenticated users

## Key Rules Enforced
- Non-super_admin cannot grant critical permissions (role_view, permission_assign, user_update, etc.)
- Non-super_admin cannot grant GLOBAL scope
- Non-super_admin cannot grant MANAGE scope
- DENY wins over ALLOW/role permissions
- Expired overrides are ignored
- Backend errors shown clearly in UI

## Final Evidence Results (2026-06-29)
- Backend build: **PASS**
- Web build: **PASS**
- API docs: **PASS** (126/126)
- Account-scope test: **PASS** (18/18)
- Access smoke: **PASS** (28/28 assertions)
- Access diagnose: **PASS** (18 users)
- Playwright targeted test: **PASS** (2/2 tests)
  - super_admin end-to-end: PASS (override add, scope grant/remove, activity audit)
  - user My Access page: PASS
- User Detail page: YES
- Effective Permissions tab: YES
- Permission Overrides tab: YES
- Data Scopes tab: YES
- Activity tab: YES
- My Access page: YES
- API service layer added: YES
- Full E2E: NO
- Deploy: NO
- Full reseed: NO
