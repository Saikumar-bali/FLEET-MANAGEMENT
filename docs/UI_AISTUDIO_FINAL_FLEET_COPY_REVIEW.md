# UI Visual Acceptance Checklist — Final Fleet Copy Polish

**Date:** 2026-06-20  
**Branch:** `ui-aistudio-final-fleet-copy-polish`  
**Base Commit:** `3f92fa672aea13c120aa4bcd0691f02a1aa66919`

## Checklist

| Check | Status |
|---|---|
| API key label removed | YES |
| Upgrade card is fleet-specific | YES |
| Settings labels are fleet-specific | YES |
| Navigation labels are fleet-specific | YES |
| Theme submenu still works | YES |
| Account menu still contains Sign out | YES |
| AccountMenu inline styles removed | YES |
| Light theme still default | YES |
| Dark theme still works | YES |
| Backend business logic changed | NO |
| Mobile changed | NO |
| Vercel deploy | NO |

## Files Changed

- `web/src/components/Sidebar.tsx` — API key → Integrations, upgrade card copy
- `web/src/components/SettingsPopover.tsx` — All labels renamed to fleet-specific
- `web/src/components/AccountMenu.tsx` — Inline styles replaced with CSS classes
- `web/src/config/navigation.ts` — Navigation labels renamed
- `web/src/app/styles.css` — Added account menu header CSS classes

## Before/After Label List

### Sidebar Bottom Icon Bar
| Before | After |
|---|---|
| API key | Integrations |

### Upgrade Card
| Before | After |
|---|---|
| Upgrade to unlock more | Upgrade fleet limits |
| Access higher limits, Pro models, and more. | Add more vehicles, users, reports, and automation. |

### Settings Popover
| Before | After |
|---|---|
| Theme | Appearance |
| Submit prompt key | Keyboard shortcuts |
| Autocomplete | Smart suggestions |
| Applet notifications | Fleet alerts |
| Account status | User access status |
| View status | System health |
| Terms of service | Usage policy |
| Privacy policy | Data & privacy |
| Send feedback | Report an issue |
| Billing Support | Help & support |

### Navigation
| Before | After |
|---|---|
| Playground | Overview |
| History | Activity History |
| New trip | New Trip |
| My fleet | My Fleet |
| Gallery | Asset Library |
| Overview (MANAGE) | Dashboard |

## Verification

- `npm run web:lint`: PASS
- `npm run web:build`: PASS
- `npm run backend:lint`: PASS
