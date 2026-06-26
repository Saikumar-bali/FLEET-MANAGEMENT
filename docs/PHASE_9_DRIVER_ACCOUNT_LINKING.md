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
