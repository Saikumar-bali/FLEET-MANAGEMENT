# Phase 18: Driver Portal Write Actions Foundation

## Status
**Completed** — Driver write actions added with permission gating and audit logging.

## Summary
Phase 18 adds write actions to the driver portal, allowing linked driver users to perform their own operational actions through `/me/driver-*` APIs. All actions are permission-gated, scoped by UserProfileLink, and audit-logged.

## Scope
- Driver write actions (trip lifecycle, fuel, expense, documents, vehicle issues, inspections)
- Permission-gated endpoints
- Audit logging for all driver actions
- Read-only frontend forms
- No admin APIs used by driver pages
- No deployment
- No full E2E

## Backend Write Endpoints

| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| POST | `/me/driver-trips` | `driver_trip_create` | Create a trip |
| PATCH | `/me/driver-trips/:id/start` | `driver_trip_start` | Start a trip |
| PATCH | `/me/driver-trips/:id/end` | `driver_trip_end` | End a trip |
| PATCH | `/me/driver-trips/:id/cancel` | `driver_trip_cancel` | Cancel a trip |
| POST | `/me/driver-fuel` | `driver_quick_fuel_create` | Quick fuel entry |
| POST | `/me/driver-expenses` | `driver_expense_create` | Expense claim |
| POST | `/me/driver-documents` | `driver_document_upload` | Upload document |
| POST | `/me/driver-vehicle-issues` | `driver_vehicle_issue_report` | Report vehicle issue |
| POST | `/me/driver-vehicle-inspections` | `driver_vehicle_inspection_create` | Vehicle inspection |

## Required Permissions

| Permission | Module | Description |
|------------|--------|-------------|
| `driver_trip_create` | driver_portal | Create trip |
| `driver_trip_start` | driver_portal | Start trip |
| `driver_trip_end` | driver_portal | End trip |
| `driver_trip_cancel` | driver_portal | Cancel trip |
| `driver_quick_fuel_create` | driver_portal | Quick fuel entry |
| `driver_expense_create` | driver_portal | Create expense |
| `driver_document_upload` | driver_portal | Upload document |
| `driver_pod_upload` | driver_portal | Upload proof of delivery |
| `driver_lr_upload` | driver_portal | Upload lorry receipt |
| `driver_challan_upload` | driver_portal | Upload challan |
| `driver_vehicle_issue_report` | driver_portal | Report vehicle issue |
| `driver_vehicle_inspection_create` | driver_portal | Create vehicle inspection |

## Security Properties
- Driver profile resolved from active UserProfileLink (not request body)
- Revoked/unlinked users get 404 on profile resolution
- vehicleId validated against driver's assigned/related vehicles
- tripId validated against linked driver
- driverId forced from UserProfileLink, not request body
- createdById/uploadedById set to current user
- All actions audit-logged with actor user id and driver id
- Missing permission returns 403
- Cross-driver data access blocked

## Trip Lifecycle
- **Create**: DRAFT status, validates vehicle belongs to driver
- **Start**: DRAFT/SCHEDULED → STARTED, updates vehicle/driver status
- **End**: STARTED → COMPLETED, calculates distance
- **Cancel**: Any non-completed → CANCELLED, releases vehicle/driver

## Fuel Entry
- Amount-only entry supported (QUICK_AMOUNT mode)
- If liters provided, price/liter auto-calculated
- No forced price-per-liter field

## Frontend Pages
| Route | Page | Description |
|-------|------|-------------|
| `/driver-portal/trips/create` | DriverTripCreatePage | Create trip form |
| `/driver-portal/fuel/create` | DriverFuelCreatePage | Quick fuel entry form |
| `/driver-portal/expenses/create` | DriverExpenseCreatePage | Expense claim form |
| `/driver-portal/documents/upload` | DriverDocumentUploadPage | Document upload form |
| `/driver-portal/vehicles/issue` | DriverVehicleIssuePage | Report vehicle issue |
| `/driver-portal/vehicles/inspect` | DriverVehicleInspectionPage | Vehicle inspection |

## List Pages Updated with Action Buttons
- DriverTripsPage: "Create Trip" button, Start/End/Cancel per-trip
- DriverFuelPage: "Quick Fuel Entry" button
- DriverExpensesPage: "Expense Claim" button
- DriverDocumentsPage: "Upload Document" button
- DriverVehiclesPage: "Report Issue" and "Vehicle Inspection" buttons

## Tests
### Backend Actions Test
`backend/scripts/driver-portal-actions-test.ts`
- 14 tests covering: create/start/end trip, fuel, expense, document, vehicle issue/inspection, cross-driver isolation, revoked link, missing permission, audit logs

### Playwright E2E Test
`web/e2e/driver-portal-actions.spec.ts`
- Status: **CREATED, MANUAL ONLY, NOT CI-GATED YET**
- Linked driver login, create trip navigation, fuel entry navigation, expense navigation, admin page blocking

## Files Changed
- `backend/prisma/schema.prisma` (VehicleIssue, VehicleInspection models)
- `backend/prisma/migrations/20260630100000_add_vehicle_issues_inspections/` (new)
- `backend/src/constants/rbac.ts` (12 driver_* permissions)
- `backend/src/modules/user-profile-links/driver-portal.controller.ts` (9 write controllers)
- `backend/src/modules/user-profile-links/driver-portal.routes.ts` (9 write routes)
- `backend/scripts/driver-portal-actions-test.ts` (new)
- `backend/package.json` (test:driver-portal-actions script)
- `web/src/services/api.ts` (9 write API functions)
- `web/src/pages/driver-portal/DriverTripCreatePage.tsx` (new)
- `web/src/pages/driver-portal/DriverFuelCreatePage.tsx` (new)
- `web/src/pages/driver-portal/DriverExpenseCreatePage.tsx` (new)
- `web/src/pages/driver-portal/DriverDocumentUploadPage.tsx` (new)
- `web/src/pages/driver-portal/DriverVehicleIssuePage.tsx` (new)
- `web/src/pages/driver-portal/DriverVehicleInspectionPage.tsx` (new)
- `web/src/pages/driver-portal/DriverTripsPage.tsx` (action buttons)
- `web/src/pages/driver-portal/DriverFuelPage.tsx` (action button)
- `web/src/pages/driver-portal/DriverExpensesPage.tsx` (action button)
- `web/src/pages/driver-portal/DriverDocumentsPage.tsx` (action button)
- `web/src/pages/driver-portal/DriverVehiclesPage.tsx` (action buttons)
- `web/src/app/App.tsx` (6 new routes)
- `web/e2e/driver-portal-actions.spec.ts` (new)
- `.github/workflows/ci.yml` (test:driver-portal-actions step)
