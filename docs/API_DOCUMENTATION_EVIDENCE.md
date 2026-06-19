# API Documentation Evidence

## Local Swagger

| Resource | Link |
|----------|------|
| Swagger UI | `http://localhost:4000/api/v1/docs` |
| OpenAPI JSON | `http://localhost:4000/api/v1/docs/openapi.json` |

## Endpoint Coverage

### Static API docs test (`npm run test:api-docs`): 86/86 PASS

| Method | Path | Required Permission | Local Tested | Test Script |
|--------|------|-------------------|-------------|-------------|
| GET | `/health` | None | PASS | api-docs-coverage-test.ts |
| POST | `/auth/login` | None | PASS | api-docs-coverage-test.ts |
| POST | `/auth/refresh` | None | PASS | api-docs-coverage-test.ts |
| POST | `/auth/logout` | None | PASS | api-docs-coverage-test.ts |
| GET | `/auth/me` | `-` | PASS | api-docs-coverage-test.ts |
| GET | `/users` | `user_view` | PASS | api-docs-coverage-test.ts |
| POST | `/users` | `user_create` | PASS | api-docs-coverage-test.ts |
| GET | `/users/{id}` | `user_view` | PASS | api-docs-coverage-test.ts |
| PATCH | `/users/{id}` | `user_update` | PASS | api-docs-coverage-test.ts |
| PATCH | `/users/{id}/status` | `user_update` | PASS | api-docs-coverage-test.ts |
| PATCH | `/users/{id}/password` | `user_update` | PASS | api-docs-coverage-test.ts |
| GET | `/roles` | `role_view` | PASS | api-docs-coverage-test.ts |
| POST | `/roles` | `role_create` | PASS | api-docs-coverage-test.ts |
| PATCH | `/roles/{id}` | `role_update` | PASS | api-docs-coverage-test.ts |
| PATCH | `/roles/{id}/permissions` | `role_update` | PASS | api-docs-coverage-test.ts |
| GET | `/permissions` | `permission_view` | PASS | api-docs-coverage-test.ts |
| GET | `/vehicles` | `vehicle_view` | PASS | api-docs-coverage-test.ts |
| POST | `/vehicles` | `vehicle_create` | PASS | api-docs-coverage-test.ts |
| GET | `/vehicles/{id}` | `vehicle_view` | PASS | api-docs-coverage-test.ts |
| PATCH | `/vehicles/{id}` | `vehicle_update` | PASS | api-docs-coverage-test.ts |
| PATCH | `/vehicles/{id}/status` | `vehicle_update` | PASS | api-docs-coverage-test.ts |
| GET | `/drivers` | `driver_view` | PASS | api-docs-coverage-test.ts |
| POST | `/drivers` | `driver_create` | PASS | api-docs-coverage-test.ts |
| GET | `/drivers/{id}` | `driver_view` | PASS | api-docs-coverage-test.ts |
| PATCH | `/drivers/{id}` | `driver_update` | PASS | api-docs-coverage-test.ts |
| PATCH | `/drivers/{id}/status` | `driver_update` | PASS | api-docs-coverage-test.ts |
| GET | `/assets/categories` | `asset_view` | PASS | api-docs-coverage-test.ts |
| POST | `/assets/categories` | `asset_create` | PASS | api-docs-coverage-test.ts |
| PATCH | `/assets/categories/{id}` | `asset_update` | PASS | api-docs-coverage-test.ts |
| GET | `/assets` | `asset_view` | PASS | api-docs-coverage-test.ts |
| POST | `/assets` | `asset_create` | PASS | api-docs-coverage-test.ts |
| GET | `/assets/{id}` | `asset_view` | PASS | api-docs-coverage-test.ts |
| PATCH | `/assets/{id}` | `asset_update` | PASS | api-docs-coverage-test.ts |
| PATCH | `/assets/{id}/status` | `asset_update` | PASS | api-docs-coverage-test.ts |
| GET | `/assets/{id}/assignments` | `asset_view` | PASS | api-docs-coverage-test.ts |
| GET | `/assets/{id}/history` | `asset_view` | PASS | api-docs-coverage-test.ts |
| POST | `/assets/{id}/assign` | `asset_assign` | PASS | api-docs-coverage-test.ts |
| POST | `/assets/{id}/return` | `asset_assign` | PASS | api-docs-coverage-test.ts |
| POST | `/assets/{id}/transfer` | `asset_update` | PASS | api-docs-coverage-test.ts |
| POST | `/assets/{id}/mark-damaged` | `asset_update` | PASS | api-docs-coverage-test.ts |
| POST | `/assets/{id}/mark-lost` | `asset_update` | PASS | api-docs-coverage-test.ts |
| GET | `/documents` | `document_view` | PASS | api-docs-coverage-test.ts |
| POST | `/documents` | `document_create` | PASS | api-docs-coverage-test.ts |
| PATCH | `/documents/{id}` | `document_update` | PASS | api-docs-coverage-test.ts |
| DELETE | `/documents/{id}` | `document_delete` | PASS | api-docs-coverage-test.ts |
| GET | `/trips` | `trip_view` | PASS | api-docs-coverage-test.ts |
| POST | `/trips` | `trip_create` | PASS | api-docs-coverage-test.ts |
| GET | `/trips/{id}` | `trip_view` | PASS | api-docs-coverage-test.ts |
| PATCH | `/trips/{id}` | `trip_update` | PASS | api-docs-coverage-test.ts |
| POST | `/trips/{id}/schedule` | `trip_schedule` | PASS | api-docs-coverage-test.ts |
| POST | `/trips/{id}/start` | `trip_start` | PASS | api-docs-coverage-test.ts |
| POST | `/trips/{id}/complete` | `trip_complete` | PASS | api-docs-coverage-test.ts |
| POST | `/trips/{id}/cancel` | `trip_cancel` | PASS | api-docs-coverage-test.ts |
| GET | `/trips/{id}/history` | `trip_view` | PASS | api-docs-coverage-test.ts |
| GET | `/fuel` | `fuel_view` | PASS | api-docs-coverage-test.ts |
| POST | `/fuel` | `fuel_create` | PASS | api-docs-coverage-test.ts |
| GET | `/fuel/{id}` | `fuel_view` | PASS | api-docs-coverage-test.ts |
| PATCH | `/fuel/{id}` | `fuel_update` | PASS | api-docs-coverage-test.ts |
| DELETE | `/fuel/{id}` | `fuel_delete` | PASS | api-docs-coverage-test.ts |
| POST | `/fuel/{id}/submit` | `fuel_submit` | PASS | api-docs-coverage-test.ts |
| POST | `/fuel/{id}/approve` | `fuel_approve` | PASS | api-docs-coverage-test.ts |
| POST | `/fuel/{id}/reject` | `fuel_approve` | PASS | api-docs-coverage-test.ts |
| POST | `/fuel/{id}/cancel` | `fuel_delete` | PASS | api-docs-coverage-test.ts |
| GET | `/expenses` | `expense_view` | PASS | api-docs-coverage-test.ts |
| POST | `/expenses` | `expense_create` | PASS | api-docs-coverage-test.ts |
| GET | `/expenses/{id}` | `expense_view` | PASS | api-docs-coverage-test.ts |
| PATCH | `/expenses/{id}` | `expense_update` | PASS | api-docs-coverage-test.ts |
| DELETE | `/expenses/{id}` | `expense_delete` | PASS | api-docs-coverage-test.ts |
| POST | `/expenses/{id}/submit` | `expense_submit` | PASS | api-docs-coverage-test.ts |
| POST | `/expenses/{id}/approve` | `expense_approve` | PASS | api-docs-coverage-test.ts |
| POST | `/expenses/{id}/reject` | `expense_approve` | PASS | api-docs-coverage-test.ts |
| POST | `/expenses/{id}/cancel` | `expense_delete` | PASS | api-docs-coverage-test.ts |

## Key Validation

- Auth login uses `identifier`/`password` (not username/email fields) ✅
- All protected endpoints have `bearerAuth` security requirement ✅
- Health, login, refresh do not require auth ✅
