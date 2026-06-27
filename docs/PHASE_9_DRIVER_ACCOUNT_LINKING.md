# Phase 9 — Driver Account Linking & Driver Portal

## Problem

The system had multiple Driver records but only one driver User account. Driver operational records and login accounts were not properly linked. When a driver logged in, he couldn't see only his own trips, fuel entries, receipts, documents, expenses, assigned vehicle, and history.

## Solution

Implemented proper Driver Account Linking and Driver Portal with scoped data access.

### Key Concepts

- **User** = login account (email/username, password, role)
- **Driver** = operational driver profile (name, mobile, license, status)
- **userDriverId** = the link between User and Driver (unique constraint)

## Data Model

The `User` model has a `userDriverId` field with a unique constraint that links to `Driver.id`. This ensures:
- Each user can link to at most one driver
- Each driver can have at most one linked user account

```prisma
model User {
  userDriverId String? @unique @map("user_driver_id")
  userDriver   Driver? @relation("UserDriver", fields: [userDriverId], references: [id], onDelete: SetNull)
}

model Driver {
  linkedUsers User[] @relation("UserDriver")
}
```

## Linking Rules

1. **Creating a driver user**: When creating a user with `role=driver`, `driverId` is required
2. **Driver uniqueness**: A driver cannot be linked to multiple active users
3. **Non-driver users**: `driverId` is rejected for non-driver roles
4. **Link/Unlink**: Admins can link/unlink drivers to existing users

## Backend Endpoints

### User Management
- `POST /api/v1/users` - Create user (with optional `driverId` for driver role)
- `POST /api/v1/users/:id/link-driver` - Link driver to user
- `DELETE /api/v1/users/:id/unlink-driver` - Unlink driver from user

### Driver Dashboard
- `GET /api/v1/dashboard/driver` - Driver-scoped dashboard
  - Driver role: uses `userDriverId` from auth, ignores query params
  - Admin/manager: requires `?driverId=...` query param

### Driver Self APIs
- `GET /api/v1/drivers/me` - Get my driver profile
- `GET /api/v1/drivers/me/trips` - Get my trips
- `GET /api/v1/drivers/me/fuel` - Get my fuel entries
- `GET /api/v1/drivers/me/expenses` - Get my expenses
- `GET /api/v1/drivers/me/documents` - Get my documents
- `GET /api/v1/drivers/me/vehicle` - Get my assigned vehicle

### Driver Creation with Account
- `POST /api/v1/drivers` - Create driver (with `createUserAccount: true`)

## Frontend

### Driver Dashboard
- Route: `/my-dashboard`
- Shows: driver profile, current vehicle, active trip, trip stats, fuel stats, recent entries, documents, expiring documents

### Driver Navigation
- My Dashboard
- My Trips
- My Documents
- Hidden: Finance, Roles, Users (admin-only)
- Non-driver users attempting to access driver pages see Access Denied

### Route Guards
- `DriverOnlyRoute` component wraps all `/my-*` routes
- Requires `role.key === 'driver'` and authenticated session
- Non-driver users redirected to Access Denied page
- Unlinked drivers (role=driver but no userDriverId) can reach driver pages but APIs return 403

### Post-Login Redirect
- Drivers land on `/my-dashboard` after login
- Admin/manager/super_admin land on `/` (Overview)
- Unlinked drivers see a warning banner on `/my-dashboard`

### Admin/Manager Features
- Users page: driver selector when creating driver users
- Users page: linked driver info in user table
- Users page: link/unlink driver actions
- Driver detail page: linked account section

## Script: Link Existing Drivers

```bash
# Dry-run (default)
npm run link-drivers -- --dry-run

# Actually create accounts
npm run link-drivers -- --apply

# With credentials output
npm run link-drivers -- --apply --output
```

### Script Rules
- Dry-run by default
- Skips test drivers (TEST, E2E, PH7_UI_TEST)
- Only creates accounts for unlinked drivers
- Never prints passwords to console
- Credentials CSV written to `.local/` only with `--output`

## Security Notes

- Driver users can only access their own scoped data
- No cross-driver data access possible
- Admin/manager can query any driver's dashboard
- Test drivers are never auto-created
- Passwords are never logged or committed

## What is NOT Included

- Mobile app (future phase)
- Alerts/Reports (separate phase)
- Vercel deployment
- Auto-merging to main

## Dynamic Permissions & Workflows (2026-06-27)

### Driver-Scoped Permissions (26 total)

All permissions in the `driver` module are scoped to the individual driver:

| Permission | Description |
|-----------|-------------|
| driver_portal_view | Can access driver portal |
| driver_my_dashboard_view | Can view own dashboard |
| driver_my_trips_view | Can view own trip list |
| driver_my_documents_view | Can view own documents |
| driver_my_profile_view | Can view own profile |
| driver_trip_create | Driver can create own trips |
| driver_trip_view | Driver can view own trip details |
| driver_trip_start | Driver can start own trips |
| driver_trip_end | Driver can end own trips |
| driver_trip_cancel | Driver can cancel own trips |
| driver_trip_document_upload | Driver can upload trip documents |
| driver_pod_upload | Driver can upload proof of delivery |
| driver_lr_upload | Driver can upload LR document |
| driver_challan_upload | Driver can upload challan |
| driver_eway_bill_upload | Driver can upload e-way bill |
| driver_quick_fuel_create | Driver can create own fuel entry |
| driver_fuel_receipt_upload | Driver can upload own fuel receipt |
| driver_fuel_view_own | Driver can view own fuel entries |
| driver_expense_create | Driver can create own expense claim |
| driver_expense_view_own | Driver can view own expenses |
| driver_expense_receipt_upload | Driver can upload own expense receipt |
| driver_assigned_vehicle_view | Driver can view assigned vehicle |
| driver_vehicle_inspection_create | Driver can submit vehicle inspection |
| driver_vehicle_issue_report | Driver can report vehicle issue |
| driver_maintenance_report_create | Driver can report maintenance |
| driver_repair_report_create | Driver can report repair |

### Roles UI Permission Clarity

The Roles page now groups driver-scoped permissions into display categories:
- **Driver Portal**: Basic access permissions
- **Driver Trips**: Trip CRUD and document upload
- **Driver Fuel**: Fuel entry and receipt upload
- **Driver Expenses**: Expense claims and receipt upload
- **Driver Vehicle**: Vehicle view, inspection, issue report
- **Driver Maintenance / Repair**: Maintenance and repair reports

Driver permission keys show friendly labels (e.g., "Driver can create own trips" instead of raw `driver_trip_create`).

**Warning boxes** appear when:
1. Selected role is `driver` — explains that driver portal uses `driver_*` permissions, not global `trip_create`
2. Global `trip_create` is selected but `driver_trip_create` is not — suggests enabling the driver-scoped version

### Permission Refresh Flow

- `refreshCurrentUser()` method added to AuthContext
- Calls `GET /auth/me` to refresh user + permissions without re-login
- "Refresh permissions" button in Account menu
- Window focus auto-refresh for driver users
- After admin changes role permissions, driver should refresh or relogin

### Driver Dashboard

- All links use `/my-*` routes (no global `/fuel/new`, `/expenses/new`, `/trips/:id`)
- Quick actions are permission-driven (only shows actions the driver has permission for)
- "My Capabilities" card lists enabled capabilities
- Individual driver stats: active trips, completed this month, total trips, fuel stats, expense stats, document stats, assigned vehicle, license expiry

### Backend Stats

Driver dashboard now returns:
- `expenseStatsThisMonth`: count + totalAmount
- `documentStats`: total, pendingVerification, expiringSoon, expired

### Created By Visibility

- Admin TripsPage shows "Created By" column with driver name/username
- "Driver-created" badge appears when the trip creator has `role.key === 'driver'`
- TripDetailPage history also shows Driver badge

### Cross-Driver Isolation

- `GET /drivers/me/trips` filters only `req.authUser.userDriverId`
- `GET /drivers/me/trips/:tripId` returns 404 if not own trip
- start/end/cancel returns 404 if not own trip
- fuel/expense/document queries are own-driver only
- vehicle is assigned vehicle only
- Backend scope test validates cross-driver isolation

### Playwright Test

Full E2E workflow test at `web/e2e/driver-dynamic-workflows.spec.ts`:
1. Admin grants `driver_trip_create` to Driver role via API
2. Driver A sees Create Trip in sidebar
3. Driver A creates a trip
4. Admin sees trip with Created By = Driver A
5. Driver B cannot see Driver A's trips
6. Admin removes permission, Driver A's Create Trip disappears
7. Direct access to `/my-trips/new` shows Access Denied

Required env vars: `ADMIN_USER`, `ADMIN_PASSWORD`, `DRIVER_A_USER`, `DRIVER_A_PASSWORD`, `DRIVER_B_USER`, `DRIVER_B_PASSWORD`

Run command:
```
cd web
npx playwright test e2e/driver-dynamic-workflows.spec.ts --headed
```
