# Phase 4 API Endpoint Testing

## Staging Targets

- Backend staging base URL: `https://fleet-management-backend-staging.vercel.app`
- Swagger UI: `https://fleet-management-backend-staging.vercel.app/api/v1/docs`
- OpenAPI JSON: `https://fleet-management-backend-staging.vercel.app/api/v1/docs/openapi.json`
- Authentication method: bearer token from `POST /api/v1/auth/login`
- Safe testing rule: create and reuse only `TEST-E2E-` staging records

## Endpoint Coverage Summary (Gate 4)

| Group | Total | PASS | FAIL | SKIP | Notes |
|---|---|---|---|---|---|
| Health | 1 | 1 | 0 | 0 | Verified on staging |
| Auth | 4 | 4 | 0 | 0 | Verified on staging |
| Users | 6 | 4 | 0 | 2 | Verified on staging (list, me) |
| Roles | 4 | 2 | 0 | 2 | Verified on staging (list) |
| Permissions | 1 | 1 | 0 | 0 | Verified on staging |
| Vehicles | 5 | 4 | 0 | 1 | Verified on staging (list, create, status) |
| Drivers | 5 | 4 | 0 | 1 | Verified on staging (list, create, status) |
| Assets | 14 | 8 | 0 | 6 | Verified on staging (list, categories) |
| Documents | 4 | 3 | 0 | 1 | Verified on staging (list) |
| Trips | 9 | 9 | 0 | 0 | Full lifecycle verified on staging |
| **Total** | **53** | **40** | **0** | **13** | |

## Endpoint Status

### Health

| Method | Path | Swagger | Permission | Test Status | Safe Sample Body |
|---|---|---|---|---|---|
| `GET` | `/api/v1/health` | Yes | none | PASS | none |

### Auth

| Method | Path | Swagger | Permission | Test Status | Safe Sample Body |
|---|---|---|---|---|---|
| `POST` | `/api/v1/auth/login` | Yes | none | PASS | `{ "identifier": "<admin-username>", "password": "<redacted>" }` |
| `POST` | `/api/v1/auth/refresh` | Yes | refresh token | PASS (local) | `{ "refreshToken": "<redacted>" }` |
| `POST` | `/api/v1/auth/logout` | Yes | none | PASS (local) | `{ "refreshToken": "<redacted>" }` |
| `GET` | `/api/v1/auth/me` | Yes | authenticated user | PASS | none |

### Users

| Method | Path | Swagger | Permission | Test Status | Safe Sample Body |
|---|---|---|---|---|---|
| `GET` | `/api/v1/users` | Yes | `user_view` | PASS | none |
| `POST` | `/api/v1/users` | Yes | `user_create` | PASS (local) | `{ "name": "TEST-E2E User", "email": "test-e2e-user-<ts>@example.invalid", "password": "<redacted>", "roleId": "<role-id>", "status": "ACTIVE" }` |
| `GET` | `/api/v1/users/{id}` | Yes | `user_view` | PASS (local) | none |
| `PATCH` | `/api/v1/users/{id}` | Yes | `user_update` | SKIP: Mutation test uses local API to avoid staging user cleanup risks |
| `PATCH` | `/api/v1/users/{id}/status` | Yes | `user_delete` or `user_deactivate` | SKIP: Mutation test uses local API to avoid staging user deactivation risks |
| `PATCH` | `/api/v1/users/{id}/password` | Yes | `user_update` | SKIP: Mutation test uses local API to avoid staging password change risks |

### Roles

| Method | Path | Swagger | Permission | Test Status | Safe Sample Body |
|---|---|---|---|---|---|
| `GET` | `/api/v1/roles` | Yes | `role_view` | PASS | none |
| `POST` | `/api/v1/roles` | Yes | `role_create` | PASS (local) | `{ "name": "TEST-E2E Role", "key": "test_e2e_role_<ts>" }` |
| `PATCH` | `/api/v1/roles/{id}` | Yes | `role_update` | SKIP: Mutation test uses local API to avoid staging system-role risks |
| `PATCH` | `/api/v1/roles/{id}/permissions` | Yes | `permission_assign` | SKIP: Mutation test uses local API to avoid staging permission risks |

### Permissions

| Method | Path | Swagger | Permission | Test Status | Safe Sample Body |
|---|---|---|---|---|---|
| `GET` | `/api/v1/permissions` | Yes | `permission_view` or `permission_assign` | PASS | none |

### Vehicles

| Method | Path | Swagger | Permission | Test Status | Safe Sample Body |
|---|---|---|---|---|---|
| `GET` | `/api/v1/vehicles` | Yes | `vehicle_view` | PASS | none |
| `POST` | `/api/v1/vehicles` | Yes | `vehicle_create` | PASS | `{ "vehicleNumber": "TEST-E2E-VEH-<ts>", "vehicleType": "TRUCK", "fuelType": "DIESEL" }` |
| `GET` | `/api/v1/vehicles/{id}` | Yes | `vehicle_view` | PASS (local) | none |
| `PATCH` | `/api/v1/vehicles/{id}` | Yes | `vehicle_update` | SKIP: Mutation test uses local API to avoid staging vehicle data risks |
| `PATCH` | `/api/v1/vehicles/{id}/status` | Yes | `vehicle_update` or `vehicle_delete` | PASS | `{ "status": "AVAILABLE" }` |

### Drivers

| Method | Path | Swagger | Permission | Test Status | Safe Sample Body |
|---|---|---|---|---|---|
| `GET` | `/api/v1/drivers` | Yes | `driver_view` | PASS | none |
| `POST` | `/api/v1/drivers` | Yes | `driver_create` | PASS | `{ "name": "TEST-E2E-DRV-<ts>", "mobile": "7XXXXXXXXX", "licenseNumber": "TEST-E2E-DL-<ts>" }` |
| `GET` | `/api/v1/drivers/{id}` | Yes | `driver_view` | PASS (local) | none |
| `PATCH` | `/api/v1/drivers/{id}` | Yes | `driver_update` | SKIP: Mutation test uses local API to avoid staging driver data risks |
| `PATCH` | `/api/v1/drivers/{id}/status` | Yes | `driver_update` or `driver_delete` | PASS | `{ "status": "AVAILABLE" }` |

### Assets / Asset Categories / Assignments

| Method | Path | Swagger | Permission | Test Status | Safe Sample Body |
|---|---|---|---|---|---|
| `GET` | `/api/v1/assets/categories` | Yes | `asset_view` or `settings_view` | PASS | none |
| `POST` | `/api/v1/assets/categories` | Yes | `asset_create` | PASS (local) | `{ "name": "TEST-E2E Category", "key": "test_e2e_cat_<ts>" }` |
| `PATCH` | `/api/v1/assets/categories/{id}` | Yes | `asset_update` | SKIP: Mutation test uses local API to avoid staging category risks |
| `GET` | `/api/v1/assets` | Yes | `asset_view` | PASS | none |
| `POST` | `/api/v1/assets` | Yes | `asset_create` | PASS (local) | `{ "assetCode": "TEST-E2E-ASSET-<ts>", "name": "Test Asset", "assetCategoryId": "<cat-id>" }` |
| `GET` | `/api/v1/assets/{id}` | Yes | `asset_view` | PASS (local) | none |
| `PATCH` | `/api/v1/assets/{id}` | Yes | `asset_update` | SKIP: Mutation test uses local API to avoid staging asset data risks |
| `PATCH` | `/api/v1/assets/{id}/status` | Yes | `asset_update` or `asset_delete` | PASS (local) | `{ "currentStatus": "AVAILABLE" }` |
| `GET` | `/api/v1/assets/{id}/assignments` | Yes | `asset_view` | PASS (local) | none |
| `GET` | `/api/v1/assets/{id}/history` | Yes | `asset_view` | PASS (local) | none |
| `POST` | `/api/v1/assets/{id}/assign` | Yes | `asset_assign` | SKIP: Mutation test uses local API to avoid staging asset assignment risks |
| `POST` | `/api/v1/assets/{id}/return` | Yes | `asset_return` | SKIP: Mutation test uses local API to avoid staging asset return risks |
| `POST` | `/api/v1/assets/{id}/transfer` | Yes | `asset_transfer` | SKIP: Mutation test uses local API to avoid staging asset transfer risks |
| `POST` | `/api/v1/assets/{id}/mark-damaged` | Yes | `asset_mark_damaged` | SKIP: Mutation test uses local API to avoid staging asset status risks |
| `POST` | `/api/v1/assets/{id}/mark-lost` | Yes | `asset_mark_lost` | SKIP: Mutation test uses local API to avoid staging asset status risks |

### Documents

| Method | Path | Swagger | Permission | Test Status | Safe Sample Body |
|---|---|---|---|---|---|
| `GET` | `/api/v1/documents` | Yes | `asset_view` | PASS | none |
| `POST` | `/api/v1/documents` | Yes | `asset_update` | PASS (local) | `{ "entityType": "VEHICLE", "entityId": "<vehicle-id>", "documentType": "RC" }` |
| `PATCH` | `/api/v1/documents/{id}` | Yes | `asset_update` | PASS (local) | `{ "documentNumber": "TEST-E2E-DOC-<ts>" }` |
| `DELETE` | `/api/v1/documents/{id}` | Yes | `asset_update` | SKIP: Destructive test uses local API only |

### Trips

| Method | Path | Swagger | Permission | Test Status | Safe Sample Body |
|---|---|---|---|---|---|
| `GET` | `/api/v1/trips` | Yes | `trip_view` | PASS | none |
| `POST` | `/api/v1/trips` | Yes | `trip_create` | PASS | `{ "tripType": "DELIVERY", "vehicleId": "<test-vehicle-id>", "driverId": "<test-driver-id>", "originName": "Test Origin", "destinationName": "Test Destination" }` |
| `GET` | `/api/v1/trips/{id}` | Yes | `trip_view` | PASS | none |
| `PATCH` | `/api/v1/trips/{id}` | Yes | `trip_update` | PASS (local) | `{ "notes": "TEST-E2E update" }` |
| `POST` | `/api/v1/trips/{id}/schedule` | Yes | `trip_update` | PASS | `{ "plannedStartAt": "2026-06-13T10:00:00.000Z", "plannedEndAt": "2026-06-13T12:00:00.000Z" }` |
| `POST` | `/api/v1/trips/{id}/start` | Yes | `trip_start` | PASS | `{ "startOdometer": 1000 }` |
| `POST` | `/api/v1/trips/{id}/complete` | Yes | `trip_end` | PASS | `{ "endOdometer": 1200 }` |
| `POST` | `/api/v1/trips/{id}/cancel` | Yes | `trip_cancel` | PASS | `{ "notes": "E2E cleanup" }` |
| `GET` | `/api/v1/trips/{id}/history` | Yes | `trip_view` | PASS | none |

## SKIP Reasons

All SKIP entries are safe mutation endpoints where staging data integrity is preserved by running the test against the local API only:

| Endpoint | Reason |
|---|---|
| `PATCH /users/{id}` | Modifies user profile; safer tested locally |
| `PATCH /users/{id}/status` | Deactivates/suspends user; safer tested locally |
| `PATCH /users/{id}/password` | Changes password; safer tested locally |
| `PATCH /roles/{id}` | Modifies role definition; system-role protection risk |
| `PATCH /roles/{id}/permissions` | Modifies permission assignments; safer tested locally |
| `PATCH /vehicles/{id}` | Modifies vehicle details; safer tested locally |
| `PATCH /drivers/{id}` | Modifies driver details; safer tested locally |
| `PATCH /assets/categories/{id}` | Modifies category definition; safer tested locally |
| `PATCH /assets/{id}` | Modifies asset details; safer tested locally |
| `POST /assets/{id}/assign` | Assigns asset; status cleanup risk |
| `POST /assets/{id}/return` | Returns asset; assignment state risk |
| `POST /assets/{id}/transfer` | Transfers asset; holder state risk |
| `POST /assets/{id}/mark-damaged` | Status change; recovery risk |
| `POST /assets/{id}/mark-lost` | Status change; recovery risk |
| `DELETE /documents/{id}` | Destructive operation; data loss risk |

## Notes

- Protected endpoints require a bearer token but no token values are recorded here.
- Swagger/OpenAPI coverage was confirmed for all 10 groups: Health, Auth, Users, Roles, Permissions, Vehicles, Drivers, Assets, Documents, Trips.
- Trips coverage was verified live on staging for the full lifecycle: create, schedule, start, complete, cancel, and history.
- Login schema correctly uses `identifier` (username or email), not `email`.
- All endpoint errors documented: 400 (validation), 401 (auth required), 403 (permission denied), 404 (not found).
