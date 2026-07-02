# AI Run: 2026-07-01 — Role-Aware Navigation & UX

## Goal
Create a professional role-aware, permission-aware, profile-aware navigation and layout system.

## Summary of Changes

### Files Changed
| File | Change |
|------|--------|
| `web/src/config/navigation.ts` | Complete rewrite: added `navigationRegistry` with full type system (`NavItem`), `getVisibleNavItems()`, `groupNavItemsBySection()`. Kept backward-compatible `navigationItems` + `sidebarSections`. |
| `web/src/utils/navigation-visibility.ts` | **New**: `explainMenuVisibility()` helper returning `{ visible, reason, missingPermissions, ... }` |
| `web/src/components/Sidebar.tsx` | Complete rewrite: registry-driven rendering, role-aware filtering, loading skeleton (no flash), no hardcoded role checks |
| `web/src/components/AccountMenu.tsx` | Added "My Access" link, divider, role key display |
| `web/src/layouts/AppLayout.tsx` | Updated to use `navigationRegistry` for page title detection |
| `web/src/pages/MyAccessPage.tsx` | Complete rewrite: tabbed interface (Summary, Role, Linked Profiles, Effective Permissions, Data Scopes, Visible Menus, Hidden Menus, Recent Activity), searchable/collapsible permission lists, user-friendly descriptions |
| `web/src/pages/driver-portal/DriverPortalHome.tsx` | Redesigned: status card, assigned vehicle card, upcoming trip card, quick action grid, activity timeline |
| `web/e2e/sidebar-role-navigation.spec.ts` | **New**: Playwright test (10 test cases) |
| `docs/ROLE_AWARE_NAVIGATION_UX.md` | **New**: documentation with role UX matrix |
| `docs/ai-runs/2026-07-01_role-aware-navigation-ux.md` | **New**: this file |

### Key Decisions
- My Access removed from primary sidebar sections; moved to SETTINGS and user menu
- Sidebar is 100% registry-driven; no hardcoded role checks in Sidebar.tsx
- super_admin bypasses all permission checks (sees every item)
- Driver items require `DRIVER` profile type + active `primaryDriverProfile`
- Global modules (Finance, Manage Trips, etc.) hidden from driver role
- Loading skeleton prevents flash of restricted items
- `explainMenuVisibility` used for both sidebar filtering and Hidden Menus display

### Build Results
- web build: PASS
- backend tsc: PASS
- test:api-docs: 126/126 PASS
- test:user-profile-link: 30/30 PASS
- test:access-smoke: PASS

### Deploy
- deploy: NO

If normal driver still sees global Finance or global Manage Trips without explicit scoped permission, final line must be:
"Role-aware navigation is still unsafe. Do not merge and do not deploy."
