# Module-Level Scope Enforcement — Run Record

## Date
2026-06-30 (hardened)

## Branch
`phase-account-scope-foundation`

## What Was Fixed

### Blocker 1: VEHICLE record-level access
- Removed `scopeType !== 'VEHICLE'` guard in `checkScopeForRecord`
- VEHICLE and DRIVER resources now check `hasScope(actor, scopeType, record.id)` directly
- All 8 resource types pass record-level scope checks

### Blocker 2: Scope access levels enforced
- `checkScopeForRecord` now accepts `requiredAccessLevel` parameter
- `assertCanReadResource` requires VIEW level
- `assertCanCreateResource` requires CREATE level
- `assertCanUpdateResource` requires UPDATE level
- `assertCanDeleteResource` requires DELETE level
- MANAGE includes all levels via `hasScope` hierarchy

### Blocker 3: Update target scope validation
- Added `assertCanChangeResourceScope()` function
- Validates new vehicleId/driverId/tripId/linkedEntityId in update input
- Blocks moving records to out-of-scope targets
- Prevents changing vehicle/driver identity

### Blocker 4: Test no longer mutates real roles
- Creates dedicated `PHASE_MODULE_SCOPE_TEST_ROLE` with all needed permissions
- Creates dedicated `PHASE_MODULE_SCOPE_TEST_NO_PERM` for missing-permission tests
- Cleanup deletes test roles, users, records, and data scopes
- Never modifies driver/admin/super_admin production roles

### Blocker 5: Missing-permission test accurate
- Uses dedicated no-permission role instead of same driver role
- Asserts denial reason is "missing permission" not "missing scope"

## Test Coverage (15 sections)
1. VEHICLE record-level scope
2. DRIVER record-level scope
3. TRIP record-level scope
4. FUEL record-level scope
5. EXPENSE record-level scope
6. DOCUMENT record-level scope
7. MAINTENANCE record-level scope
8. REPAIR record-level scope
9. Scope access level enforcement (VIEW cannot update/delete)
10. Create scope level enforcement (VIEW cannot create)
11. Update target scope validation (out-of-scope blocked)
12. Missing permission test (no permission role)
13. super_admin global access
14. Admin not automatically global
15. List filtering via scoped where (Vehicle, Trip, Fuel)

## Evidence Results (latest)
- Backend TypeScript: **PASS** (tsc --noEmit clean)
- Web build: **PASS**
- API docs: **PASS** (126/126)
- Account-scope test: **PASS** (18/18)
- Access smoke: **PASS** (28/28)
- Access diagnose: **PASS** (21 users)
- Module-scope test: **PASS** (16 sections, all assertions)
- Full E2E: NO
- Deploy: NO

## Latest Session Fixes
1. **assertCanChangeResourceScope wired into all 8 update controllers** — Trip, Fuel, Expense, Document, Maintenance, Repair, Vehicle, Driver
2. **CREATE no longer grants VIEW** — hierarchy changed to `CREATE: ['CREATE']` only
3. **List filters respect VIEW level** — `scopeCanSatisfyLevel(ds, 'VIEW')` excludes CREATE-only scopes
4. **Owner bypass restricted** — `createdById` only allows VIEW, not UPDATE/DELETE
5. **Controller/service wiring tested** — tests exercise the exact call pattern controllers use
6. **Dedicated test roles** — never mutates production driver/admin/super_admin roles
