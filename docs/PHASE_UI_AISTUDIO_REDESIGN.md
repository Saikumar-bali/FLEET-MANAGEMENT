# Phase: UI AI Studio Redesign

## Branch

`ui-aistudio-redesign`

## Summary

Complete UI/UX overhaul of the Fleet Management web app, inspired by Google AI Studio's visual language. The redesign covers the design system, app shell, and all major pages.

## What Changed

### Design System (styles.css)

Complete rewrite of `web/src/app/styles.css` (~1,100 lines → ~1,000 lines):

**Color Tokens:**
- Clean white/gray surfaces (`#f8f9fa` page, `#ffffff` surface)
- Subtle borders (`#dadce0`, `#e8eaed`)
- Google-blue accent (`#1a73e8`)
- Semantic colors: success (`#1e8e3e`), warning (`#e37400`), danger (`#d93025`)
- Clean text hierarchy: primary (`#202124`), secondary (`#5f6368`), tertiary (`#80868b`)

**Typography:**
- Font: Inter (Google Fonts) - clean, modern sans-serif
- Scale: 11px–28px with proper weights
- 14px base (up from 13px) for better readability

**Spacing Scale:**
- 4px base unit with consistent multipliers
- Generous padding on cards, tables, forms

**Border Radius:**
- 6px–20px scale for modern rounded feel
- Full radius (9999px) for badges/chips

**Shadows:**
- 5-level elevation system (xs, sm, md, lg, xl)
- Subtle, modern shadow colors

**Components:**
- Buttons: clean 36px height, rounded corners, subtle hover
- Cards: 12px radius, light borders, clean backgrounds
- Tables: clean headers, subtle row separators
- Forms: consistent input styling, focus rings
- Badges: semantic colors with subtle backgrounds
- Modals: smooth slide-up animation, clean borders
- Status badges: consistent color mapping

### App Shell

**Sidebar:**
- Clean left sidebar with dark background
- Brand mark "FM" with gradient
- "Fleet Management" title (was "Hippofleet")
- Grouped navigation sections
- Compact nav items with hover states
- Clean profile footer

**Topbar:**
- Clean white header with border-bottom
- Sticky positioning
- Section eyebrow + page title + description
- Role badge and sign-out button

**Layout:**
- Full-height sidebar, fluid main panel
- `page-content` class for consistent page padding
- Max-width constraint for content

### Pages Redesigned

| Page | Changes |
|------|---------|
| **Login** | Updated branding to "Fleet Management", new feature list |
| **Dashboard** | Clean card layout, quick links, session detail |
| **Vehicles** | Filter bar, clean table, status badges |
| **Vehicle Detail** | Tab navigation, clean form sections |
| **Drivers** | Filter bar, clean table, status badges |
| **Driver Detail** | Tab navigation, clean form sections |
| **Assets** | Filter bar, clean table, status badges |
| **Asset Detail** | Tab navigation, assignment view, history |
| **Asset Categories** | List-detail layout with clean cards |
| **Trips** | Filter bar with type/status, clean table |
| **Trip Detail** | Tab navigation, lifecycle actions |
| **Fuel** | Filter bar, clean table, workflow actions |
| **Expenses** | Filter bar, clean table, workflow actions |
| **Roles** | Permission matrix with clean module rows |
| **Users** | List-detail layout, create/edit separation |

### Permission Matrix

- Module rows with background distinction
- Clean checkbox cells
- Permission code with monospace font
- Description with secondary text color
- Select all / Clear per module
- Sticky save toolbar
- Search and count display

### Inline Style Cleanup

All inline `style={}` attributes removed from pages and most components:
- VehiclesPage, DriversPage, AssetsPage, TripsPage
- VehicleDetailPage, DriverDetailPage, TripDetailPage
- AssetDetailPage, AssetCategoriesPage
- DashboardPage, RolesPage, UsersPage
- WorkflowListPage, WorkflowDetailPage
- LoginPage, ErrorState

### Status Badge Colors

Updated to match the new design system:
- Green tones for positive states (AVAILABLE, ACTIVE, APPROVED, COMPLETED)
- Blue tones for informational (ON_TRIP, ASSIGNED, SUBMITTED, SCHEDULED)
- Yellow tones for warnings (ON_LEAVE, UNDER_MAINTENANCE)
- Red tones for negative (UNDER_REPAIR, SUSPENDED, DAMAGED, LOST, ACCIDENT, REJECTED)
- Gray tones for neutral (INACTIVE, SOLD, RETIRED, DRAFT, CANCELLED)
- Purple for system (SYSTEM)

## Local Commands Run

| Command | Result |
|---------|--------|
| `npm run web:lint` | PASS (exit 0) |
| `npm run web:build` | PASS (exit 0) |
| `npm run backend:lint` | PASS (exit 0) |
| `npm run backend:build` | FAIL (Prisma EPERM Windows DLL, not code-related) |
| `npm --prefix backend run test:api-docs` | NOT RUN |
| `npm --prefix backend run test:trips` | NOT RUN |
| `npm --prefix backend run test:fuel-expenses` | NOT RUN |
| `npm --prefix backend run test:maintenance-repairs` | NOT RUN |
| Playwright headed | NOT RUN (backend not running) |

## Files Changed

- `web/src/app/styles.css` — Complete design system rewrite
- `web/src/components/Sidebar.tsx` — Updated branding and navigation
- `web/src/components/StatusBadge.tsx` — New color palette
- `web/src/components/ErrorState.tsx` — Removed inline styles
- `web/src/layouts/AppLayout.tsx` — Updated topbar branding
- `web/src/pages/LoginPage.tsx` — Updated branding
- `web/src/pages/DashboardPage.tsx` — Clean card layout
- `web/src/pages/VehiclesPage.tsx` — Consistent filter bar
- `web/src/pages/VehicleDetailPage.tsx` — Clean forms, no inline styles
- `web/src/pages/DriversPage.tsx` — Consistent filter bar
- `web/src/pages/DriverDetailPage.tsx` — Clean forms, no inline styles
- `web/src/pages/AssetsPage.tsx` — Consistent filter bar
- `web/src/pages/AssetDetailPage.tsx` — Clean forms, no inline styles
- `web/src/pages/AssetCategoriesPage.tsx` — Updated wrapper
- `web/src/pages/TripsPage.tsx` — Consistent filter bar
- `web/src/pages/TripDetailPage.tsx` — Clean forms, no inline styles
- `web/src/pages/RolesPage.tsx` — Updated wrapper
- `web/src/pages/UsersPage.tsx` — Updated wrapper
- `web/src/pages/WorkflowListPage.tsx` — Reformatted, consistent CSS
- `web/src/pages/WorkflowDetailPage.tsx` — Reformatted, consistent CSS
- `web/index.html` — Updated title

## Not Changed

- Backend business logic (no changes)
- API contracts (no changes)
- Mobile app (not modified)
- Authentication flow (preserved)
- Role-based visibility (preserved)
- Test files (preserved)

## Vercel Deploy

NOT RUN

## Next Step

Run backend API tests and Playwright against local backend and web, then commit, push, and open PR.
