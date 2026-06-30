# Phase 17: Driver Portal UI Foundation

## Status
**Accepted** — Read-only driver portal UI using `/me/driver-*` APIs only.

## Summary
Phase 17 creates a secure, read-only driver portal UI that allows driver users to view their own linked driver data. The portal uses only the existing `/me/driver-*` backend endpoints — no admin APIs are used by driver pages.

## Scope
- Read-only driver portal UI
- Uses `/me/driver-*` only
- No admin APIs used by driver pages
- No write actions
- No mobile app
- No deployment

## Routes Added
| Route | Page | Description |
|-------|------|-------------|
| `/driver-portal` | DriverPortalHome | Dashboard with summary cards |
| `/driver-portal/profile` | DriverProfilePage | Driver profile details |
| `/driver-portal/trips` | DriverTripsPage | Trips assigned to driver |
| `/driver-portal/vehicles` | DriverVehiclesPage | Vehicles linked to driver |
| `/driver-portal/documents` | DriverDocumentsPage | Documents for driver |
| `/driver-portal/fuel` | DriverFuelPage | Fuel entries for driver |
| `/driver-portal/expenses` | DriverExpensesPage | Expenses for driver |

## API Client Functions
All in `web/src/services/api.ts`:
- `getMyDriverProfile(token)` → `GET /me/driver-profile`
- `getMyDriverTrips(token, params?)` → `GET /me/driver-trips`
- `getMyDriverVehicles(token)` → `GET /me/driver-vehicles`
- `getMyDriverDocuments(token, params?)` → `GET /me/driver-documents`
- `getMyDriverFuel(token, params?)` → `GET /me/driver-fuel`
- `getMyDriverExpenses(token, params?)` → `GET /me/driver-expenses`

## Security Properties
- Driver portal layout checks `/access/me/summary` for `profileTypes` including `DRIVER` or `primaryDriverProfile`
- Unlinked users see: "No driver profile linked to this account"
- All `/me/driver-*` endpoints return 404 for revoked/unlinked users
- Cross-driver data isolation verified by `test:driver-portal-security`
- No hardcoded driver IDs
- No direct admin APIs used by driver pages
- No localStorage driverId hacks

## Sidebar Integration
- Driver Portal menu item only shown when user has a DRIVER profile link
- Uses `getMyAccessSummary` to check `profileTypes` and `primaryDriverProfile`

## MyAccessPage Integration
- Shows "Open Driver Portal" link when user has a DRIVER profile type
- Shows "No linked driver profile" for unlinked users
- Does not expose admin profile-link tools to normal users

## Tests
### Backend Security Test
`backend/scripts/driver-portal-security-test.ts`
- 23 tests covering: own profile, scoped trips/fuel/expenses/vehicles/documents, cross-driver isolation, revoked link 404, unlinked 404, no-auth 401

### Playwright E2E Test
`web/e2e/driver-portal.spec.ts`
- Linked driver opens portal
- Pages load without cross-driver data
- Unlinked user sees clean empty state
- Direct navigation works
- No admin controls visible

## Files Changed
- `backend/src/modules/user-profile-links/driver-portal.controller.ts` (unchanged)
- `backend/src/modules/user-profile-links/driver-portal.routes.ts` (unchanged)
- `backend/scripts/driver-portal-security-test.ts` (new)
- `backend/package.json` (added test:driver-portal-security script)
- `web/src/types/auth.ts` (added DriverPortal* types)
- `web/src/services/api.ts` (added driver portal API functions)
- `web/src/pages/driver-portal/DriverPortalLayout.tsx` (new)
- `web/src/pages/driver-portal/DriverPortalHome.tsx` (new)
- `web/src/pages/driver-portal/DriverProfilePage.tsx` (new)
- `web/src/pages/driver-portal/DriverTripsPage.tsx` (new)
- `web/src/pages/driver-portal/DriverVehiclesPage.tsx` (new)
- `web/src/pages/driver-portal/DriverDocumentsPage.tsx` (new)
- `web/src/pages/driver-portal/DriverFuelPage.tsx` (new)
- `web/src/pages/driver-portal/DriverExpensesPage.tsx` (new)
- `web/src/app/App.tsx` (added driver portal routes)
- `web/src/pages/MyAccessPage.tsx` (added Driver Portal link)
- `web/src/components/Sidebar.tsx` (added conditional Driver Portal menu)
- `web/e2e/driver-portal.spec.ts` (new)
- `.github/workflows/ci.yml` (added test:driver-portal-security)
