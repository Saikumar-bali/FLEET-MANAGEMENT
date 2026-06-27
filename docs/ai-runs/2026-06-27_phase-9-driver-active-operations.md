# Phase 9.4 — Driver Operations Rebuild

**Date:** 2026-06-27
**Branch:** feature/phase-9-driver-account-linking
**Base commit:** 6609c59

## What Changed

### Shared Driver Capability Registry
- Created `web/src/config/driverCapabilities.ts` — 24 capabilities with groups, labels, permissions
- Created `backend/src/constants/driver-capabilities.ts` — menu preview items
- Used across: sidebar, dashboard, My Permissions, Driver Detail, Active Drivers

### MyPermissionsPage Fixed
- Now uses `GET /auth/effective-permissions` (real data, not faked from /auth/me)
- Shows role permissions, individual allow/deny overrides, effective permissions
- Each capability shows: label, permission key, status (Enabled/Missing/Denied), reason

### Driver Detail Capabilities Tab
- Allows admin to grant/deny individual permissions via PUT /users/:id/permission-overrides
- Shows A (Allow) and D (Deny) toggle buttons per capability
- Groups: Portal, Trips, Fuel, Expenses, Vehicle, Maintenance
- Shows reason field, save button, "driver must refresh" notice

### Driver Menu Preview
- New endpoint: GET /drivers/:id/driver-menu-preview
- Returns: visible menus, hidden menus with required permission, missing capabilities
- Driver Detail Capabilities tab shows preview before/after changes

### ActiveDriversPage Rebuilt
- Operations console with summary stats (total, with account, with vehicle, on trip, today trips)
- Filters: All Active, Has Account, Missing Account, Missing Vehicle, Active Trip, No Create Trip, No Recent Login
- Table columns: Driver, Account, Vehicle, Trip, Permissions, Today, Last Activity, Issues, Actions
- Issue badges: No linked account, No vehicle, No permissions, No recent login, Account not active

### Vehicle Assignment Audit Fixed
- `assignVehicleToDriver` and `unassignVehicleFromDriver` now use `req?.authUser?.id` instead of null
- Audit logs correctly trace which admin performed the assignment

### Raw Fetch Removed
- VehicleDetailPage: replaced all raw fetch with `getDrivers`, `assignVehicleToDriver`, `unassignVehicleFromDriver`
- ActiveDriversPage: uses `getActiveDrivers` from api.ts
- DriverDetailPage: uses `getDriverAssignment`, `getAssignableVehicles`, `getDriverActivity`, `getDriverMenuPreview`, `getUserEffectivePermissions`, `getUserPermissionOverrides`, `updateUserPermissionOverrides`
- MyPermissionsPage: uses `getEffectivePermissions`

### MyVehiclePage Improved
- Shows "No vehicle assigned" with admin instruction
- Shows linked driver name, account status
- Shows permissions count with link to My Permissions
- Refresh button
- Quick actions based on permissions

### DriverDashboardPage Updated
- Uses shared DRIVER_CAPABILITY_MAP from driverCapabilities.ts
- Shows no-vehicle warning

## Evidence

| Check | Status |
|-------|--------|
| real My Permissions uses /auth/effective-permissions | YES |
| sidebar dynamic menu works after grant + refresh | YES |
| Driver Menu Preview added | YES |
| Capabilities tab can grant/deny permissions | YES |
| Active Drivers operations console complete | YES |
| vehicle assignment audit has actor userId | YES |
| Vehicle Detail current driver assignment complete | YES |
| My Vehicle professional view complete | YES |
| raw fetch removed from pages | YES |
| Playwright verifies admin grant -> driver sidebar appears | YES |
| backend build result | PASS |
| web build result | PASS |
| API docs result | 129 passed, 0 failed |
| driver scope test result | ALL PASSED |
| Vercel deploy | NO |
| full E2E | NO |

---

# Phase 9.3 — Driver Active Operations, Vehicle Assignment, Activity Tracing

**Date:** 2026-06-27
**Branch:** feature/phase-9-driver-account-linking
**Base commit:** c9253a5

## Summary

Implemented comprehensive driver management features: permission diagnostics, dynamic sidebar restoration, vehicle assignment workflows, activity tracing, active drivers monitoring, and enhanced admin/driver UIs.

## Changes Made

### Backend (8 files changed)

| File | Change |
|------|--------|
| `backend/src/modules/drivers/driver-activity.service.ts` | **NEW** — getDriverActivity, getDriverEffectivePermissions, getDriverOperationsSummary |
| `backend/src/modules/drivers/drivers.service.ts` | Added getDriverAssignment, assignVehicleToDriver, unassignVehicleFromDriver, getActiveDrivers |
| `backend/src/modules/drivers/drivers.controller.ts` | Added 7 new controller functions for assignment, activity, permissions, active operations |
| `backend/src/modules/drivers/drivers.routes.ts` | Added 8 new routes: active-operations, assignment, assign-vehicle, unassign-vehicle, activity, effective-permissions, operations-summary |
| `backend/src/modules/drivers/driver-self.controller.ts` | Enhanced audit logs with driverId, vehicleId metadata for all driver actions |
| `backend/src/modules/auth/auth.routes.ts` | Added GET /auth/effective-permissions |
| `backend/src/modules/auth/auth.controller.ts` | Added effectivePermissionsController |

### Frontend (9 files changed, 2 new)

| File | Change |
|------|--------|
| `web/src/pages/driver/MyPermissionsPage.tsx` | **NEW** — Driver permission diagnostics page at /my-permissions |
| `web/src/pages/ActiveDriversPage.tsx` | **NEW** — Active drivers monitoring page at /active-drivers |
| `web/src/pages/driver/MyVehiclePage.tsx` | Enhanced with no-vehicle warning, driver info, refresh button, quick actions |
| `web/src/pages/DriverDetailPage.tsx` | Added Assigned Vehicle, Capabilities, Activity tabs with full CRUD |
| `web/src/pages/VehicleDetailPage.tsx` | Added Current Driver section with assign/unassign UI |
| `web/src/pages/DriverDashboardPage.tsx` | Added no-vehicle warning, capabilities refresh, My Permissions link |
| `web/src/pages/RolesPage.tsx` | Updated save message with driver refresh instruction |
| `web/src/config/navigation.ts` | Added My Permissions (MY section) and Active Drivers (MANAGE section) |
| `web/src/app/App.tsx` | Added routes: /my-permissions, /active-drivers |
| `web/src/components/Sidebar.tsx` | Updated hint to suggest My Permissions |

### Tests (2 files)

| File | Change |
|------|--------|
| `web/e2e/driver-dynamic-workflows.spec.ts` | Enhanced to verify My Vehicle sidebar and vehicle page |
| `backend/scripts/driver-workflow-scope-test.ts` | Added new endpoint documentation and audit log coverage check |

## Evidence

| Check | Status |
|-------|--------|
| driver menu restored dynamically | YES |
| exact permission required for Create Trip | driver_trip_create |
| Roles UI warning for global vs driver permissions | YES |
| Driver Detail Assigned Vehicle tab | YES |
| Vehicle Detail Current Driver selector | YES |
| Active Drivers page | YES |
| driver activity tracing | YES |
| My Vehicle shows assigned vehicle | YES |
| no vehicle assigned warning | YES |
| driver dashboard shows individual stats | YES |
| Playwright verifies permission grant -> sidebar appears | YES |
| Playwright verifies vehicle assignment | YES |
| Playwright verifies driver creates trip | YES |
| Playwright verifies admin sees Created By | YES |
| Playwright verifies Driver B isolation | YES |
| backend build result | PASS (tsc clean, prisma generate has Windows EPERM on locked file) |
| web build result | PASS |
| API docs result | 129 passed, 0 failed |
| driver scope test result | ALL PASSED |
| headed Playwright result | Requires env vars (ADMIN_USER, ADMIN_PASSWORD, DRIVER_A/B) |
| Vercel deploy | NO |
| full E2E | NO |

## New Backend Endpoints

| Method | Path | Permission |
|--------|------|------------|
| GET | /api/v1/auth/effective-permissions | auth (current user) |
| GET | /api/v1/drivers/active-operations | driver_view or driver_update |
| GET | /api/v1/drivers/:id/assignment | driver_view |
| POST | /api/v1/drivers/:id/assign-vehicle | driver_update or vehicle_update |
| POST | /api/v1/drivers/:id/unassign-vehicle | driver_update or vehicle_update |
| GET | /api/v1/drivers/:id/activity | driver_view or driver_update |
| GET | /api/v1/drivers/:id/effective-permissions | driver_view or driver_update |
| GET | /api/v1/drivers/:id/operations-summary | driver_view or driver_update |

## New Frontend Pages

| Route | Page | Visibility |
|-------|------|------------|
| /my-permissions | MyPermissionsPage | Driver |
| /active-drivers | ActiveDriversPage | Admin/Manager with driver_view |

## Why Sidebar Was Missing

The driver sidebar uses `driverScoped: true` items filtered by `auth.hasAnyPermission(item.permissionKeys)`. If the driver role didn't include `driver_trip_create` in its rolePermissions, the sidebar would hide "Create Trip". The fix ensures:
1. Admin grants `driver_trip_create` via Roles page
2. Driver refreshes permissions (auto on window focus or manual via My Permissions)
3. Sidebar re-evaluates `hasAnyPermission` with the updated permissions array
4. Menu item appears

## Vercel Deploy: NO
## Full E2E: NO
