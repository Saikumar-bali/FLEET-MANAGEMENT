# Role Workspace Engine

## Overview

The Role Workspace Engine provides a normalized, permission-aware workspace for every user. Instead of scattered role checks across sidebar, pages, and components, the engine centralizes workspace resolution in a single backend endpoint (`GET /api/v1/me/workspace`) and a frontend context (`WorkspaceContext`).

## Architecture

```
Backend: /api/v1/me/workspace
  ├── getEffectivePermissions(userId)   — role + overrides
  ├── getUserProfileLinks(userId)        — active profile links
  ├── getProfileTypesForUser(userId)     — distinct profile types
  └── getWorkspace(userId)               — assemble workspace response

Frontend: WorkspaceContext
  ├── fetches /me/workspace on auth change
  ├── provides workspace, capabilities, navigation, quickActions
  └── useWorkspace() hook for components
```

## Workspace Types

| Type | Role Key | Profile Types | Description |
|------|----------|---------------|-------------|
| SUPER_ADMIN | super_admin | any | Full platform control, all modules, all settings |
| ADMIN | admin | any | Company administration based on permissions/scopes |
| MANAGER | manager | any | Operations dashboard, trips, vehicles, drivers, submissions |
| SUPERVISOR | supervisor | any | Assigned operational review, submissions, issues |
| DRIVER | driver | DRIVER | Driver Portal, My Trips, My Vehicle, My Fuel, etc. |
| ASSISTANT_DRIVER | assistant_driver | ASSISTANT_DRIVER | Limited driver portal |
| MECHANIC | mechanic | any | Repairs, maintenance, inspections |
| FINANCE | finance | any | Finance dashboard, billing, payments, reports |
| COLLECTOR | collector | any | Collections, payments, receipts |
| VIEWER | viewer | any | Read-only reports and modules |
| MIXED | any | multiple | Shows workspace switcher |

## Workspace Response

```json
{
  "user": { "id", "name", "username", "roleKey" },
  "workspaceType": "DRIVER",
  "profileLinks": [],
  "primaryProfiles": { "driver": null, "mechanic": null, "finance": null, "collector": null },
  "effectivePermissions": ["driver_portal_view", "driver_trip_create", ...],
  "dataScopes": [],
  "capabilities": {
    "canUseDriverPortal": true,
    "canCreateDriverTrip": true,
    "canSelfCheckoutVehicle": false,
    ...
  },
  "navigation": [
    { "section": "DRIVER", "label": "Driver", "items": [...] },
    { "section": "WORKSPACE", "label": "Workspace", "items": [...] }
  ],
  "quickActions": [{ "id": "create_trip", "label": "Create Trip", ... }],
  "emptyStates": [],
  "diagnostics": []
}
```

## Capabilities Matrix

| Capability | Required Permission(s) |
|------------|----------------------|
| canUseDriverPortal | driver_portal_view + DRIVER profile |
| canCreateDriverTrip | driver_trip_create |
| canSelfCheckoutVehicle | driver_vehicle_self_checkout |
| canViewAvailableVehicles | driver_available_vehicle_select |
| canReviewDriverSubmissions | driver_submission_view OR driver_submission_review |
| canUseFinance | finance_view |
| canUseMaintenance | maintenance_view |
| canUseAdmin | user_view OR role_view |
| canManageTrips | trip_view |
| canCreateTrips | trip_create |
| canManageVehicles | vehicle_view |
| canManageDrivers | driver_view |
| canReviewFuel | driver_fuel_approve |
| canReviewExpenses | driver_expense_approve |

## Role Permissions vs Profile Links vs Data Scopes

- **Role Permissions**: Base permissions granted to every user with that role. Defined in `rbac.ts` as `defaultRolePermissionMap`.
- **Profile Links**: Connect a user to a real-world profile (Driver, Mechanic, Finance, etc.). Required for profile-scoped workspaces (DRIVER must have an active DRIVER profile link).
- **Data Scopes**: Restrict which records a user can see (e.g., VEHICLE scope limits vehicle access to specific vehicles).

The workspace engine combines all three to determine:
1. Which workspace type the user gets
2. What capabilities they have
3. What navigation items they see
4. What quick actions are available

## Driver Vehicle Access

Driver vehicle access is resolved from four sources:
1. **currentDriverId assignment** — vehicle explicitly assigned to the driver
2. **Trip history** — vehicles the driver has used in past trips
3. **VEHICLE data scopes** — vehicles granted via data scope
4. **AVAILABLE vehicles with pool checkout** — vehicles available in the pool with `driver_available_vehicle_select` permission

## UI Rules

1. No raw permission dumps in main workflow pages
2. No large debug panels by default
3. Details in dialogs/drawers, not full-page tables
4. Quick action cards for primary workflows
5. Clear empty states: what happened, why, what to do next
6. No emoji labels anywhere
7. Buttons appear only when capability says allowed
8. Forms are role-specific and short
9. Advanced access diagnostics only under Settings / My Access
10. Mobile responsive layout

## CI & Security Status

| Gate | Status |
|------|--------|
| Backend workspace engine test (13 role assertions + template safety) | PASSED — 239 assertions at commit `1d7417e` |
| Role template safety verification (no admin/finance/approve in driver/viewer) | PASSED — all 6 templates verified in test |
| CI workspace engine step runs after seeds, before deploy | CONFIGURED — `.github/workflows/ci.yml` runs seeds before tests |
| Playwright E2E (role-workspace-ux.spec.ts) | **8/8 PASSED** — env-only credentials, driver/finance/manager/viewer/admin/mechanic verified, no emoji, no flash, no restricted menu. Requires env credentials not present in CI |
| Hardcoded credentials in E2E tests | REMOVED — all credentials come from env vars, fail fast if missing |
| Sidebar hardcoded role checks | REMOVED — sidebar renders from `workspace.navigation` only |
| Workspace home debug/diagnostics panels | REMOVED — no empty states, no diagnostics section in any role home |
| My Access in primary navigation | REMOVED — `my-access` removed from `NAV_ITEMS` in workspace-types.ts |
| Backend `tsc --noEmit` | PASSED |
| Frontend `tsc --noEmit` | PASSED |
| `test:api-docs` | 126/126 PASSED |
| `test:account-scope` | 18/18 PASSED |
| `access:smoke` | 28/28 PASSED |
| `test:module-scope` | PASSED |
| `test:module-scope-api` | PASSED |
| `test:user-profile-link` | 30/30 PASSED |
| `test:driver-portal-security` | 23/23 PASSED (fixed Test 5 vehicle response path) |
| `test:driver-portal-integration` | 26/26 PASSED |
| `test:workspace-engine` | 239/239 PASSED |
| GitHub Actions | **PASSED** — run [28581133973](https://github.com/Saikumar-bali/FLEET-MANAGEMENT/actions/runs/28581133973) at commit `1d7417e` |

> **Verdict**: Role Workspace Engine is **CI-gated**. All backend tests pass. Playwright E2E **8/8 PASSED**. Driver sidebar now shows navigation via roleKey fallback. Viewer no longer sees admin items. Ready for manual browser verification, then PR to main.

## File Locations

- Backend workspace types: `backend/src/constants/workspace-types.ts`
- Backend workspace service: `backend/src/services/workspace.service.ts`
- Backend workspace controller: `backend/src/modules/workspace/workspace.controller.ts`
- Backend workspace routes: `backend/src/modules/workspace/workspace.routes.ts`
- Frontend workspace types: `web/src/types/workspace.ts`
- Frontend workspace context: `web/src/context/WorkspaceContext.tsx`
- Frontend workspace hook: `web/src/hooks/useWorkspace.ts`
- Frontend action registry: `web/src/config/actions.ts`
- Frontend workspace home: `web/src/pages/workspace/WorkspaceHome.tsx`
- Role templates: `backend/src/constants/role-templates.ts`
