# Module-Level Scope Enforcement

## Phase 15: Backend Scoped Data Isolation

### Goal
Enforce account-level data isolation across backend modules. Permissions control what actions a user can perform. Data scopes control which records the user can access. super_admin is global. admin is not automatically global. Normal users are isolated by default.

### Affected Modules
1. **Trips** — scopeType: TRIP/VEHICLE, permissions: trip_view/create/update/delete
2. **Vehicles** — scopeType: VEHICLE, permissions: vehicle_view/create/update/delete
3. **Drivers** — scopeType: DRIVER, permissions: driver_view/create/update/delete
4. **Fuel** — scopeType: VEHICLE, permissions: fuel_view/create/update/delete
5. **Expenses** — scopeType: VEHICLE, permissions: expense_view/create/update/delete
6. **Documents** — scopeType: VEHICLE, permissions: document_view/create/update/delete
7. **Maintenance** — scopeType: VEHICLE, permissions: maintenance_view/create/update/delete
8. **Repairs** — scopeType: VEHICLE, permissions: repair_view/create/update/delete

### Enforcement Layers

#### 1. Scoped List Filters
Each list endpoint applies a where clause combining:
- Owner field (createdById/uploadedById) matching actor user ID
- Vehicle scope IDs for VEHICLE-scoped resources
- Driver scope IDs for DRIVER-scoped resources  
- Trip scope IDs for TRIP-scoped resources
- super_admin / GLOBAL+MANAGE scope: no filter (sees all)

#### 2. Record-Level Assertions
Each get/update/delete endpoint loads the record and asserts:
- Actor has the required permission (view/update/delete)
- Actor's scopes include the record's vehicle/driver/trip, or actor is the owner, or actor is global

#### 3. Create-Time Scope Validation
Each create endpoint checks:
- Actor has the create permission
- If creating for a vehicleId/driverId/tripId, actor must have matching scope or be global

### Core Files
- `backend/src/modules/access/resource-scope-map.ts` — maps resources to permissions, scopeTypes, relation fields
- `backend/src/modules/access/scoped-enforcement.service.ts` — assertion and where-clause generation functions
- `backend/scripts/module-scope-test.ts` — focused test for scoped enforcement

### Key Design Decisions
- Enforcement at controller layer (not service layer) to keep services reusable
- Services accept optional `extraWhere` for list functions
- super_admin bypasses all data scope restrictions via `isGlobalUser()`
- admin is NOT automatically global — requires explicit GLOBAL+MANAGE scope
- Own-created records are always accessible to the creator
- 403 with clear message on access denial
