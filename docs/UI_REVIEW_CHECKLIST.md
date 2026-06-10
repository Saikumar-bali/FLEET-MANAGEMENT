# UI Review Checklist

## Scope

Phase 3.1 enterprise frontend UX stabilization: fix vehicle/driver/asset detail page layout, permission matrix simplification, checkbox CSS fix, and stable page layout primitives.

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

### Vehicle Detail (`/vehicles/:id`)
- [ ] General Information form is full-width, not squeezed into a grid column.
- [ ] Status Management is not a tiny side card that overlaps the form.
- [ ] Status uses a compact select + Update button, not a 2-column button grid.
- [ ] Tab navigation (Overview, Registration, Expiry Dates, Documents, Status) is visible.
- [ ] Each section fills the full width.
- [ ] Documents section is full-width placeholder.
- [ ] No inline layout styles (gridTemplateColumns, etc.) outside the component.
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
- [ ] Page is usable in a single view (no scrolling needed to see full permission table).

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

## Verification Proof

Date: `2026-06-10`

### Build/Lint Results
- `npm run backend:lint`: pass
- `npm run backend:build`: pass
- `npm run web:lint`: pass
- `npm run web:build`: pass

### Manual UI Verification (1366×768)
- `/vehicles/:id` — Layout confirmed: full-width form, tab navigation works, status select+button not overlapping.
- `/roles` — Permission table renders correctly, checkboxes are 16px, role selector works, save button visible.
- `/users` — Create/Edit flows work, table clean.
- `/assets/:id` — Full-width layout, action buttons compact, tabs work.

### Playwright UI Verification
- Login as admin
- Open /vehicles/:id — General Information visible, form width usable, Status section not overlapping
- Open /roles — Permission checkbox bounding box normal (not huge), Save Permissions button visible, role selector/list visible
- Open /users — Create User button visible

## Notes

- The permission matrix was redesigned from a two-column card grid to a single table grouped by module.
- Checkbox/radio CSS was fixed to use 16px instead of inheriting `width: 100%`.
- Vehicle/Driver/Asset detail pages now use tab-based navigation with full-width form sections.
- All pages use reusable CSS layout primitives (`form-page`, `form-main`, `form-side`, `detail-tabs`, `action-panel`, `form-two-column`).
- No Phase 4 (Trips, Fuel, Expenses, Maintenance, Finance) work was started.
- No mobile changes were made.
- No secrets committed.
