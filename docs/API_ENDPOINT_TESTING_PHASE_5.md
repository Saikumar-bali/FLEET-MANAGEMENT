# Phase 5 API Endpoint Testing: Fuel and Expenses

## Live Links

- **Swagger UI**: https://fleet-management-backend-staging.vercel.app/api/v1/docs
- **OpenAPI JSON**: https://fleet-management-backend-staging.vercel.app/api/v1/docs/openapi.json

## Fuel Endpoints

| Method | URL | Permission | Local Test | Staging Test | Swagger/OpenAPI | Status |
|--------|-----|-----------|------------|--------------|-----------------|--------|
| GET | `/fuel` | bearerAuth/fuel_view | PASS (200) | PASS (200) | Present | PASS |
| POST | `/fuel` | bearerAuth/fuel_create | PASS (201) | PASS (201) | Present | PASS |
| GET | `/fuel/{id}` | bearerAuth/fuel_view | PASS (200) | PASS (200) | Present | PASS |
| PATCH | `/fuel/{id}` | bearerAuth/fuel_update | PASS (200) | PASS (200) | Present | PASS |
| DELETE | `/fuel/{id}` | bearerAuth/fuel_delete | PASS (200) | PASS (200) | Present | PASS |
| POST | `/fuel/{id}/submit` | bearerAuth/fuel_submit | PASS (200) | PASS (200) | Present | PASS |
| POST | `/fuel/{id}/approve` | bearerAuth/fuel_approve | PASS (200) | PASS (200) | Present | PASS |
| POST | `/fuel/{id}/reject` | bearerAuth/fuel_reject | PASS (200) | PASS (200) | Present | PASS |
| POST | `/fuel/{id}/cancel` | bearerAuth/fuel_cancel | PASS (200) | PASS (200) | Present | PASS |

## Expense Endpoints

| Method | URL | Permission | Local Test | Staging Test | Swagger/OpenAPI | Status |
|--------|-----|-----------|------------|--------------|-----------------|--------|
| GET | `/expenses` | bearerAuth/expense_view | PASS (200) | PASS (200) | Present | PASS |
| POST | `/expenses` | bearerAuth/expense_create | PASS (201) | PASS (201) | Present | PASS |
| GET | `/expenses/{id}` | bearerAuth/expense_view | PASS (200) | PASS (200) | Present | PASS |
| PATCH | `/expenses/{id}` | bearerAuth/expense_update | PASS (200) | PASS (200) | Present | PASS |
| DELETE | `/expenses/{id}` | bearerAuth/expense_delete | PASS (200) | PASS (200) | Present | PASS |
| POST | `/expenses/{id}/submit` | bearerAuth/expense_submit | PASS (200) | PASS (200) | Present | PASS |
| POST | `/expenses/{id}/approve` | bearerAuth/expense_approve | PASS (200) | PASS (200) | Present | PASS |
| POST | `/expenses/{id}/reject` | bearerAuth/expense_reject | PASS (200) | PASS (200) | Present | PASS |
| POST | `/expenses/{id}/cancel` | bearerAuth/expense_cancel | PASS (200) | PASS (200) | Present | PASS |

## Validation Endpoints

| Method | URL | Permission | Local Test | Staging Test | Swagger/OpenAPI | Status |
|--------|-----|-----------|------------|--------------|-----------------|--------|
| POST | `/fuel` (vehicle/trip mismatch) | bearerAuth/fuel_create | PASS (400) | PASS (400) | Present | PASS |

## Summary

- **Total endpoints**: 19
- **PASS**: 19
- **FAIL**: 0
- **SKIP**: 0
- **NOT RUN**: 0

All Fuel and Expense API endpoints pass local testing, staging smoke testing, and are correctly documented in Swagger/OpenAPI with:
- bearerAuth security on all protected endpoints
- Login uses identifier/password
- Request and response schemas present
- Vehicle/trip mismatch validation present
