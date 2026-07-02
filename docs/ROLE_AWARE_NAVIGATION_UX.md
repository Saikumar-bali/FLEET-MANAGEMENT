# Role-Aware Navigation & UX

## Overview

The sidebar navigation system is role-aware, permission-aware, and profile-aware.
It uses a single central navigation registry. There is no second sidebar in the
Driver Portal. My Access is removed from the main sidebar and is only reachable
via the bottom user account menu.

## Architecture

### Single global sidebar
- The main `Sidebar` component in `web/src/components/Sidebar.tsx` is the **only** sidebar.
- `DriverPortalLayout.tsx` no longer renders a second sidebar — it is a simple passthrough `<Outlet />` wrapper.
- All navigation (including driver items) is rendered from the central registry.

### Central navigation registry
- All nav items are defined in `web/src/config/navigation.ts` as a `navigationRegistry` array.
- Each item supports: `requiredPermissions`, `requiredAnyPermissions`, `requiredProfileTypes`,
  `requiredRoleKeys`, `hiddenForRoleKeys`, `requirePrimaryDriverProfile`, `requireGlobalAccess`.
- The sidebar calls `getVisibleNavItems()` which filters the registry based on the
  user's access summary and role key.
- No hardcoded role checks remain in the Sidebar component or any layout.

### My Access moved to user menu only
- My Access is **removed** from the navigation registry entirely — no longer a primary sidebar item.
- It is only reachable via the bottom user account menu (click the avatar/account chip in sidebar footer).
- The `/my-access` route still works for direct URL navigation.
- AccountMenu popover includes: user info, My Access, Sign out.

### Sidebar waits for access summary
- Sidebar fetches `/access/me/summary` on mount.
- While loading, a skeleton placeholder is shown — no flash of restricted or global items.
- After summary loads, `getVisibleNavItems()` filters the registry by:
  1. Role key (requiredRoleKeys / hiddenForRoleKeys)
  2. Effective permissions (requiredPermissions / requiredAnyPermissions)
  3. Profile types (requiredProfileTypes)
  4. Primary driver profile (requirePrimaryDriverProfile)
  5. Global access (requireGlobalAccess)
- `super_admin` bypasses all permission/profile checks.

### No emoji in UI strings
- All emoji characters have been removed from sidebar labels, page headers, buttons,
  quick action cards, empty states, and toast notifications.
- Professional SVG line icons are used instead.
- Toast icons replaced with inline SVG components (checkmark, close, warning, info).

## Driver Portal UX

### Driver Portal is profile-gated
- DRIVER section items only appear when:
  1. The user has an active `DRIVER` profile type
  2. `primaryDriverProfile` exists (non-null)
  3. The required driver permissions are in `effectivePermissions`
- Without a linked driver profile, drivers see only the WORKSPACE section with Overview.
- No second sidebar renders on the Driver Portal page.

### Driver Portal loading states
- **Loading**: Shows skeleton placeholder with PageHeader — never blocks the shell.
- **No driver profile (404)**: Shows "No driver profile is linked to this account." with Back to Home button.
- **Error**: Shows "Unable to load driver workspace." with Retry button.
- **Loaded**: Shows status cards (profile, vehicle, trip), quick actions grid (6 items), and recent activity timeline.

### Driver Portal quick actions
- Create Trip, Quick Fuel, Expense Claim, Upload Document, Report Issue, Inspection
- Each action has a clean SVG line icon and color-coded top border.

## Driver Sidebar Sections

For linked driver users, the sidebar shows:

**WORKSPACE**
- Overview

**DRIVER**
- Driver Portal
- My Trips
- My Vehicle
- My Fuel
- My Expenses
- My Documents
- My Issues
- My Inspections

Global modules (Finance, Manage Trips, Compliance, Admin, Documents) are hidden
from normal drivers via `hiddenForRoleKeys: ['driver']`.

## My Access Tabs

The My Access page now shows tabs in this order:

1. **Summary** — Account overview, driver profile status, quick stats
2. **Linked Profiles** — What profiles are linked to this account
3. **Visible Menus** — Which sidebar menus are visible
4. **Hidden Menus** — Which menus are hidden and why (uses explainMenuVisibility)
5. **Permissions** — Full permission list with search (for admin users)
6. **Activity** — Recent account activity

For normal users, the Summary tab provides human-readable explanations:
- "You can create trips"
- "You cannot access Finance"
- "Driver profile linked: Suresh Babu Nair"

For admin/super_admin users, the Permissions tab shows the full technical list.

## Global admin modules hidden from normal drivers

- All OPERATIONS, FINANCE, COMPLIANCE, DOCUMENTS, ADMIN items have
  `hiddenForRoleKeys: ['driver']`.
- `super_admin` bypasses all permission checks and sees every item.
- Other roles (admin, manager, finance, mechanic, viewer) see items based on
  their effective permissions.

## Role UX Matrix

| Item | super_admin | admin | manager | finance | mechanic | viewer | driver (linked) | driver (unlinked) |
|------|-------------|-------|---------|---------|----------|--------|-----------------|-------------------|
| Overview | always | always | always | always | always | always | always | always |
| Manage Trips | always | perm | perm | hidden | hidden | perm | hidden | hidden |
| Vehicles | always | perm | perm | hidden | perm | perm | hidden | hidden |
| Drivers | always | perm | perm | hidden | hidden | perm | hidden | hidden |
| Fuel | always | perm | perm | perm | hidden | perm | hidden | hidden |
| Expenses | always | perm | perm | perm | hidden | perm | hidden | hidden |
| Maintenance | always | perm | perm | hidden | perm | perm | hidden | hidden |
| Repairs | always | perm | perm | hidden | perm | perm | hidden | hidden |
| Compliance | always | perm | perm | hidden | hidden | perm | hidden | hidden |
| Finance Dashboard | always | perm | perm | perm | hidden | hidden | hidden | hidden |
| Documents Vault | always | perm | perm | hidden | hidden | perm | hidden | hidden |
| Users | always | perm | perm | hidden | hidden | hidden | hidden | hidden |
| Roles & Permissions | always | perm | perm | hidden | hidden | hidden | hidden | hidden |
| Driver Portal | always | hidden | hidden | hidden | hidden | hidden | perm+profile | hidden |
| My Trips | always | hidden | hidden | hidden | hidden | hidden | perm+profile | hidden |
| My Fuel | always | hidden | hidden | hidden | hidden | hidden | perm+profile | hidden |
| My Expenses | always | hidden | hidden | hidden | hidden | hidden | perm+profile | hidden |
| My Documents | always | hidden | hidden | hidden | hidden | hidden | perm+profile | hidden |
| My Issues | always | hidden | hidden | hidden | hidden | hidden | perm+profile | hidden |
| My Inspections | always | hidden | hidden | hidden | hidden | hidden | perm+profile | hidden |

Key:
- `always` = always visible for this role
- `perm` = visible only if user has the required effective permission(s)
- `hidden` = always hidden (via `hiddenForRoleKeys`)
- `perm+profile` = visible only if user has driver permissions AND active DRIVER profile link

## Design Constraints

- **No dual sidebar**: Driver Portal must never render a second sidebar/panel.
- **No emoji UI labels**: All sidebar, page, button, and card labels use clean text + SVG line icons.
- **My Access must not appear in primary sidebar**: Only in bottom user menu.
- **Sidebar must wait for access summary**: No flash of restricted items during load.
- **Normal driver must NOT see global Finance or global Manage Trips**: Verified by Playwright tests.

## Key Files

- `web/src/config/navigation.ts`: Complete navigation registry with `NavItem` type, `getVisibleNavItems()`, `groupNavItemsBySection()`
- `web/src/utils/navigation-visibility.ts`: `explainMenuVisibility()` helper
- `web/src/components/Sidebar.tsx`: Registry-driven sidebar with skeleton loading, no hardcoded role checks
- `web/src/components/AccountMenu.tsx`: User menu with My Access link (no sidebar item for My Access)
- `web/src/layouts/AppLayout.tsx`: Uses `navigationRegistry` for page title detection
- `web/src/pages/MyAccessPage.tsx`: 6-tab redesigned My Access (Summary, Linked Profiles, Visible Menus, Hidden Menus, Permissions, Activity)
- `web/src/pages/driver-portal/DriverPortalLayout.tsx`: Simple passthrough — no second sidebar
- `web/src/pages/driver-portal/DriverPortalHome.tsx`: Professional dashboard with skeleton loading, error states, quick actions, and activity timeline. No emoji.
- `web/e2e/sidebar-role-navigation.spec.ts`: 10-case Playwright test verifying single sidebar, no emoji, no loading stuck
- `docs/ROLE_AWARE_NAVIGATION_UX.md`: This document
