# UI Review Checklist

## Scope

Phase 3.2 final UI quality gate and safety cleanup: cleaned RolesPage inline styles into reusable CSS classes, improved Permission Matrix UX, added Playwright env-driven test setup, removed unsafe cleanup script.

## Visual Review Checklist

### Global
- [ ] Root font size is 13px.
- [ ] Checkboxes are 16px, not full-width.
- [ ] Radio buttons are 16px, not full-width.
- [ ] All inputs except checkbox/radio use `width: 100%`.
- [ ] No horizontal overflow at 1366px, 1024px, or 768px.
- [ ] No overlapping cards.
- [ ] Card padding is 12px–16px.
- [ ] Input height is 32px–36px.
- [ ] Page titles are 20px–22px.
- [ ] Labels are 12px.
- [ ] Table font is 12px–13px.
- [ ] No inline layout styles in page files (gridTemplateColumns, maxWidth on cards, etc.).

### Vehicle Detail (`/vehicles/:id`)
- [ ] General Information form is full-width, not squeezed into a grid column.
- [ ] Status Management is not a tiny side card that overlaps the form.
- [ ] Status uses a compact select + Update button, not a 2-column button grid.
- [ ] Tab navigation (Overview, Registration, Expiry Dates, Documents, Status) is visible.
- [ ] Each section fills the full width.
- [ ] Documents section is full-width placeholder.
- [ ] Save button is on the top-right.

### Driver Detail (`/drivers/:id`)
- [ ] Personal Information form is full-width.
- [ ] Status uses select + Update button, not button grid.
- [ ] Tab navigation is visible.
- [ ] No squeezed fields.

### Asset Detail (`/assets/:id`)
- [ ] Asset form is full-width.
- [ ] Action buttons (Assign, Return, Transfer, Damage, Lost) are compact and aligned.
- [ ] Assignment/history tables are readable.
- [ ] Tab navigation is visible.
- [ ] No squeezed layout.

### Roles (`/roles`)
- [ ] Permission checkboxes are 16px (not huge).
- [ ] Permissions are shown in a table, not a card grid.
- [ ] Role selector/dropdown is at the top.
- [ ] Create Role button is visible.
- [ ] Save Permissions button is visible and sticky.
- [ ] Search input filters permissions.
- [ ] Select all / Clear actions per module.
- [ ] Selected count is shown.
- [ ] Role details compact panel is visible.
- [ ] No giant permission cards.
- [ ] No two-column permission grid.
- [ ] All inline styles replaced with CSS classes (`role-permission-toolbar`, `permission-module-row`, etc.).

### Users (`/users`)
- [ ] Create user is in a modal, separate from edit.
- [ ] Table is clean and not cramped.
- [ ] Edit form is in the detail panel.
- [ ] Create button is visible.

### General UI
- [ ] Sidebar/topbar has low density.
- [ ] Responsive at 1366px, 1024px, and 768px.
- [ ] No horizontal overflow.
- [ ] No overlapping cards.

## Playwright Test Setup

- `npm run test:e2e` — runs all Playwright tests headless.
- `npm run test:e2e:headed` — runs all Playwright tests in headed mode.
- Credentials are configurable via env vars: `E2E_ADMIN_IDENTIFIER` and `E2E_ADMIN_PASSWORD` (defaults: `admin` / `admin@123`).
- Base URL is configurable via `E2E_BASE_URL` (defaults to `http://127.0.0.1:4173`).
- No hardcoded credentials in test files.

## Safety Notes

- `backend/scripts/cleanup-users.ts` has been removed — no unsafe scripts remain.
- No Phase 4 (Trips, Fuel, Expenses, Maintenance, Finance) work was started.
- No mobile changes were made.
- No secrets committed.

## Verification Proof

Date: `2026-06-10`

### Build/Lint Results
- `npm run backend:lint`: pass
- `npm run backend:build`: pass
- `npm run web:lint`: pass
- `npm run web:build`: pass

### Playwright UI Verification
- Login as admin
- Open /vehicles/:id — General Information visible, form width usable
- Open /roles — Permission checkboxes 16px, Save Permissions visible, no inline styles
- Open /users — Create User button visible
