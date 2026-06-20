# UI Visual Acceptance Checklist — AI Studio Sidebar Exact Light Toggle

**Date:** 2026-06-19  
**Branch:** `ui-aistudio-sidebar-exact-light-toggle`  
**Rejected Commit:** `9ac848fc457b2dbe8544f52ebab63a1913da402b`

## Checklist

| Check | Status |
|---|---|
| Light mode is default | YES |
| Dark mode still works from Theme menu | YES |
| System theme option works | YES |
| Sidebar sections are EXPLORE / BUILD / MANAGE | YES |
| Sidebar top title and chevron match reference | YES |
| Desktop collapse toggle works | YES |
| Bottom upgrade card added | YES |
| Bottom icon bar added (bell, gear, search, key) | YES |
| Settings gear opens popover | YES |
| Theme submenu works (Light/Dark/System) | YES |
| Account chip opens account menu | YES |
| Logout moved from topbar to account menu | YES |
| No dark-only hardcoding remains | YES |
| No Inter font remains | YES |
| Screenshots added | YES |
| Playwright headed run | PASS |
| Backend business logic changed | NO |
| Mobile changed | NO |
| Vercel deploy | NO |

## Files Changed

- `web/src/context/ThemeContext.tsx` — NEW: ThemeProvider with light/dark/system support
- `web/src/components/Sidebar.tsx` — Rewritten: AI Studio-style with EXPLORE/BUILD/MANAGE sections
- `web/src/components/SettingsPopover.tsx` — NEW: Settings popover with theme submenu
- `web/src/components/AccountMenu.tsx` — NEW: Account menu with sign out
- `web/src/layouts/AppLayout.tsx` — Updated: removed logout from topbar, added sidebar state
- `web/src/config/navigation.ts` — Updated: new section structure (EXPLORE/BUILD/MANAGE)
- `web/src/app/styles.css` — Rewritten: light/dark tokens with [data-theme] selectors
- `web/src/app/App.tsx` — Updated: added ThemeProvider wrapper

## Theme Behavior

- Default theme: LIGHT
- Stored in localStorage key: `fleet-studio-theme`
- Applied via `data-theme="light"` / `data-theme="dark"` on `<html>`
- System mode uses `prefers-color-scheme` media query
- Theme change updates all surfaces, sidebar, cards, inputs, tables

## Screenshots

All screenshots in `docs/ui-review/screenshots/google-ai-studio-sidebar-correction/`:

1. `login.png` — Login page
2. `dashboard-light.png` — Dashboard in light mode
3. `sidebar-expanded-light.png` — Sidebar expanded in light mode
4. `vehicles-light.png` — Vehicles page in light mode
5. `settings-menu-light.png` — Settings popover open in light mode
6. `theme-submenu-light.png` — Theme submenu open in light mode
7. `account-menu-light.png` — Account menu open in light mode
8. `sidebar-collapsed-light.png` — Sidebar collapsed in light mode
9. `dashboard-dark.png` — Dashboard in dark mode
10. `sidebar-expanded-dark.png` — Sidebar expanded in dark mode

## Verification

- `npm run web:lint`: PASS
- `npm run web:build`: PASS
- `npm run backend:lint`: PASS
- Playwright screenshot capture: PASS (10 screenshots)
