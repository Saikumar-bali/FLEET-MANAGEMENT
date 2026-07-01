# Driver Portal — Main Module Integration

## Overview

The Driver Portal uses the same backend modules (Trips, Fuel, Expenses, Documents, Vehicles) as the admin interface. Driver-created records appear in the main admin modules automatically.

## Vehicle Resolution (`/me/driver-vehicles`)

Vehicles are resolved from 4 sources, in priority order:

1. **Current assignment** — `Vehicle.currentDriverId == linkedDriverId`
2. **Trip history** — Vehicles used in trips where `trip.driverId == linkedDriverId`
3. **Vehicle scopes** — `UserDataScope` with `scopeType: VEHICLE` for the logged-in user
4. **Available selection** — Only if user has `driver_available_vehicle_select` permission. Shows `AVAILABLE` vehicles within scope.

The response shape is:
```json
{
  "vehicles": [{ "id", "vehicleNumber", "type", "brand", "model", "status", "odometer", "isCurrent", "source" }],
  "primaryVehicle": { "id", "vehicleNumber" } | null,
  "emptyReason": "string | null"
}
```

`emptyReason` explains why the list is empty when no vehicles are found.

### Permission: `driver_available_vehicle_select`

- **Not assigned by default** to the `driver` role
- Must be explicitly granted by admin
- When granted, the driver can see `AVAILABLE` vehicles within their VEHICLE data scope (or globally if they have a GLOBAL scope)
- Without this permission, drivers only see assigned vehicles and trip-history vehicles

## Assigned Vehicle Admin UX

### Driver Detail Page (`/drivers/:id`)

- **Vehicle tab** shows the currently assigned vehicle with details
- Admin can **Assign Vehicle** — modal with vehicle selector showing available and currently-assigned vehicles
- Admin can **Change Vehicle** — same modal
- Admin can **Remove Assignment** — confirmation dialog, sets `Vehicle.currentDriverId = null`
- Requires `vehicle_update` permission

### Vehicle Detail Page (`/vehicles/:id`)

- Shows **Current Driver** in the detail grid
- Admin can update via standard vehicle edit form (`currentDriverId` field)

## Trip Creation (`/driver-portal/trips/create`)

- Drivers create trips through `POST /me/driver-trips`
- Backend derives `driverId` from the active `UserProfileLink` — frontend never sends it
- `vehicleId` must be from the `/me/driver-vehicles` allowed list (enforced server-side)
- Created trips appear in admin `/trips` and driver `/driver-portal/trips`
- A `DRAFT` trip is created with `CREATED` history entry

## Fuel Entry (`/driver-portal/fuel/create`)

- Amount-first flow with quick amount chips (1000, 2000, 5000, 10000)
- Optional liters, odometer, station, payment mode
- Fuel bill photo upload with receipt extraction:
  1. Driver uploads bill photo
  2. File stored through main documents module as `FUEL_BILL` type
  3. Receipt extraction runs (returns mocked data when `RECEIPT_EXTRACTION_PROVIDER=disabled`)
  4. Extracted fields shown in preview panel
  5. Driver confirms by clicking "Apply to form"
  6. Fuel entry created, document linked via `fuelEntryId`
- No auto-submit of extracted data without confirmation
- Fuel entries appear in admin Fuel module and driver My Fuel list

## Expense Entry (`/driver-portal/expenses/create`)

- Amount, category, optional trip (own trips only), optional vehicle
- Receipt photo upload stored as Document in main module
- Expenses appear in admin Expenses module and driver My Expenses

## Documents Vault (`/driver-portal/documents`)

Driver documents query includes:
- Documents uploaded by the current user
- Documents linked to the linked Driver profile
- Documents linked to driver's own trips
- Documents linked to driver's assigned vehicles
- Fuel bills linked to driver's fuel entries
- Expense receipts linked to driver's expenses
- Admin-uploaded documents linked to driver/trips/vehicles

Upload supports linking to:
- Driver profile
- Own trip
- Own vehicle
- Own fuel entry (via FUEL_BILL flow)
- Own expense (via expense receipt upload)

Cross-driver document linking is blocked server-side by `assertDriverOwnsTrip` / `assertDriverOwnsVehicle`.

## Connected-to-Main-Module Behavior

| Driver creates... | Appears in admin... |
|---|---|
| Trip | `/trips` — Manage Trips |
| Fuel entry | Fuel module |
| Expense | Expenses module |
| Document | Documents Vault |

## Backend Integration Test

Run: `npm --prefix backend run test:driver-portal-integration`

Tests:
1. Linked driver with assigned vehicle sees it in `/me/driver-vehicles`
2. Trip history vehicle appears
3. No-assignment driver gets `emptyReason`
4. `driver_available_vehicle_select` permission flow
5. Without permission, unrestricted access blocked
6. Trip creation with allowed vehicle
7. Out-of-scope vehicle blocked
8. Trip appears in admin view
9. Amount-only fuel entry works
10. Fuel bill document linked via `fuelEntryId`
11. Extraction preview returned (not auto-submitted)
12. Expense receipt document created
13. Driver documents include related entities
14. Cross-driver document link blocked
15. Revoked profile link blocks access

## Deploy

**DO NOT DEPLOY** — this integration is still under active development.

## Full E2E

**Not yet implemented** — Playwright tests are manual-only at this stage.
