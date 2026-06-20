# UI Run Evidence — AI Studio Sidebar Exact Light Toggle Correction

**Date:** 2026-06-19  
**Branch:** `ui-aistudio-sidebar-exact-light-toggle`  
**Rejected Commit:** `9ac848fc457b2dbe8544f52ebab63a1913da402b`

## Rejection Reason

The previous push only made the app dark-only. It did not replicate the Google AI Studio sidebar shown in the reference screenshot. The sidebar must visually match Google AI Studio with:
- Light mode as default
- Theme menu supporting Light / Dark / System
- AI Studio-style sidebar with EXPLORE / BUILD / MANAGE sections
- Desktop collapse toggle
- Bottom upgrade card, icon bar, account chip
- Settings popover with all required rows
- Account menu with sign out

## Changes Made

### New Files
- `web/src/context/ThemeContext.tsx` — ThemeProvider with light/dark/system support and localStorage persistence
- `web/src/components/SettingsPopover.tsx` — Settings popover with theme submenu and all required rows
- `web/src/components/AccountMenu.tsx` — Account menu with user info and sign out

### Modified Files
- `web/src/components/Sidebar.tsx` — Complete rewrite: AI Studio-style sidebar with EXPLORE/BUILD/MANAGE sections, collapse toggle, upgrade card, icon bar, account chip
- `web/src/layouts/AppLayout.tsx` — Removed logout from topbar, added sidebar collapse state, wired up popovers
- `web/src/config/navigation.ts` — New section structure (EXPLORE/BUILD/MANAGE) with AI Studio-style nav items
- `web/src/app/styles.css` — Complete rewrite: light/dark tokens using [data-theme] selectors, light mode as default
- `web/src/app/App.tsx` — Added ThemeProvider wrapper

## Screenshots Created

All in `docs/ui-review/screenshots/google-ai-studio-sidebar-correction/`:

1. `login.png`
2. `dashboard-light.png`
3. `sidebar-expanded-light.png`
4. `vehicles-light.png`
5. `settings-menu-light.png`
6. `theme-submenu-light.png`
7. `account-menu-light.png`
8. `sidebar-collapsed-light.png`
9. `dashboard-dark.png`
10. `sidebar-expanded-dark.png`

## Commands Run

| Command | Status | Exit Code |
|---|---|---|
| `npm run web:lint` | PASS | 0 |
| `npm run web:build` | PASS | 0 |
| `npm run backend:lint` | PASS | 0 |
| Playwright screenshot capture | PASS | 0 |

## Additional Checks

- Playwright headed run: PASS (screenshots captured successfully)
- Backend business logic changed: NO
- Mobile changed: NO
- Vercel deploy: NO
- Secrets printed: NO
