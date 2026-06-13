# Phase 4 API Endpoint Testing

## Staging Targets

- Backend staging base URL: `https://fleet-management-backend-staging.vercel.app`
- Swagger UI: `https://fleet-management-backend-staging.vercel.app/api/v1/docs`
- OpenAPI JSON: `https://fleet-management-backend-staging.vercel.app/api/v1/docs/openapi.json`
- Authentication method: bearer token from `POST /api/v1/auth/login`
- Safe testing rule: create and reuse only `TEST-E2E-` staging records

## Endpoint Status

| Method | Path | Permission required | Status | Safe sample request body |
|---|---|---|---|---|
| `GET` | `/api/v1/health` | none | PASS | none |
| `GET` | `/api/v1/docs` | none | PASS | none |
| `GET` | `/api/v1/docs/openapi.json` | none | PASS | none |
| `POST` | `/api/v1/auth/login` | none | PASS | `{ "identifier": "<staging-admin-identifier>", "password": "<redacted>" }` |
| `GET` | `/api/v1/auth/me` | authenticated user | PASS | none |
| `POST` | `/api/v1/auth/logout` | authenticated user | NOT RUN | none |
| `POST` | `/api/v1/auth/refresh` | refresh token | NOT RUN | `{ "refreshToken": "<redacted>" }` |
| `GET` | `/api/v1/users` | `user_view` | PASS | none |
| `POST` | `/api/v1/users` | `user_create` | NOT RUN in this gate | `{ "name": "TEST-E2E User", "email": "test-e2e-user@example.invalid", "mobile": "7000000000", "password": "<redacted>", "roleId": "<role-id>", "status": "ACTIVE" }` |
| `PATCH` | `/api/v1/users/:id` | `user_update` | NOT RUN in this gate | `{ "name": "TEST-E2E User Updated", "mobile": "7000000001", "status": "ACTIVE" }` |
| `PATCH` | `/api/v1/users/:id/status` | `user_deactivate` or `user_delete` | NOT RUN in this gate | `{ "status": "INACTIVE" }` |
| `PATCH` | `/api/v1/users/:id/password` | `user_update` | NOT RUN in this gate | `{ "password": "<redacted>" }` |
| `GET` | `/api/v1/roles` | `role_view` | PASS | none |
| `POST` | `/api/v1/roles` | `role_create` | NOT RUN in this gate | `{ "name": "Test Role", "key": "test_role", "description": "Staging-only test role" }` |
| `PATCH` | `/api/v1/roles/:id` | `role_update` | NOT RUN in this gate | `{ "description": "Updated staging-only description" }` |
| `PATCH` | `/api/v1/roles/:id/permissions` | `permission_assign` | NOT RUN in this gate | `{ "permissionIds": ["<permission-id>"] }` |
| `GET` | `/api/v1/permissions` | `permission_view` or `permission_assign` | PASS | none |
| `GET` | `/api/v1/vehicles` | `vehicle_view` | PASS | none |
| `POST` | `/api/v1/vehicles` | `vehicle_create` | PASS via Playwright/API helper | `{ "vehicleNumber": "TEST-E2E-TRIP-VEH-<timestamp>", "vehicleType": "TRUCK", "fuelType": "DIESEL" }` |
| `GET` | `/api/v1/drivers` | `driver_view` | PASS | none |
| `POST` | `/api/v1/drivers` | `driver_create` | PASS via Playwright/API helper | `{ "name": "TEST-E2E-TRIP-DRV-<timestamp>", "mobile": "7XXXXXXXXX", "licenseNumber": "TEST-E2E-DL-<timestamp>" }` |
| `GET` | `/api/v1/assets` | `asset_view` | NOT RUN in this gate | none |
| `GET` | `/api/v1/documents` | `asset_view` or related document permission | NOT RUN in this gate | none |
| `GET` | `/api/v1/trips` | `trip_view` | PASS |
| `POST` | `/api/v1/trips` | `trip_create` | PASS via Playwright/API helper | `{ "tripType": "DELIVERY", "vehicleId": "<test-vehicle-id>", "driverId": "<test-driver-id>", "originName": "Test Origin", "destinationName": "Test Destination" }` |
| `GET` | `/api/v1/trips/:id` | `trip_view` | PASS via Playwright/UI detail load | none |
| `PATCH` | `/api/v1/trips/:id` | `trip_update` | NOT RUN in this gate | `{ "notes": "TEST-E2E update" }` |
| `POST` | `/api/v1/trips/:id/schedule` | `trip_update` | PASS via Playwright | `{ "plannedStartAt": "2026-06-13T10:00:00.000Z", "plannedEndAt": "2026-06-13T12:00:00.000Z" }` |
| `POST` | `/api/v1/trips/:id/start` | `trip_start` | PASS via Playwright | `{ "startOdometer": 1000 }` |
| `POST` | `/api/v1/trips/:id/complete` | `trip_end` | PASS via Playwright | `{ "endOdometer": 1050 }` |
| `POST` | `/api/v1/trips/:id/cancel` | `trip_cancel` | PASS via cleanup flow | `{ "notes": "E2E cleanup" }` |
| `GET` | `/api/v1/trips/:id/history` | `trip_view` | PASS via Playwright | none |

## Notes

- Protected endpoints require a bearer token but no token values are recorded here.
- Swagger/OpenAPI coverage was confirmed for Health, Auth, Users, Roles, Permissions, Vehicles, Drivers, Assets, Documents, and Trips.
- Trips coverage was verified live for `GET /trips`, `POST /trips`, `GET /trips/:id`, `POST /trips/:id/schedule`, `POST /trips/:id/start`, `POST /trips/:id/complete`, `POST /trips/:id/cancel`, and `GET /trips/:id/history`.
