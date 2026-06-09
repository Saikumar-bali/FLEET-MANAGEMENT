# API Design

Use `/api/v1` prefix for all endpoints.

## Response Format

Success:

```json
{
  "success": true,
  "message": "Operation successful",
  "data": {}
}
```

Error:

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": []
}
```

## Auth

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/v1/auth/login` | Login |
| POST | `/api/v1/auth/refresh` | Refresh token |
| POST | `/api/v1/auth/logout` | Logout |
| GET | `/api/v1/auth/me` | Current user |

## Users / Roles / Permissions

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/v1/users` | List users |
| POST | `/api/v1/users` | Create user |
| GET | `/api/v1/users/:id` | View user |
| PATCH | `/api/v1/users/:id` | Update user |
| DELETE | `/api/v1/users/:id` | Delete/deactivate user |
| GET | `/api/v1/roles` | List roles |
| POST | `/api/v1/roles` | Create role |
| PATCH | `/api/v1/roles/:id/permissions` | Update role permissions |
| GET | `/api/v1/permissions` | List permissions |

## Vehicles

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/v1/vehicles` | List vehicles |
| POST | `/api/v1/vehicles` | Create vehicle |
| GET | `/api/v1/vehicles/:id` | Vehicle details |
| PATCH | `/api/v1/vehicles/:id` | Update vehicle |
| DELETE | `/api/v1/vehicles/:id` | Delete/deactivate vehicle |
| POST | `/api/v1/vehicles/:id/documents` | Upload document |
| GET | `/api/v1/vehicles/:id/history` | Vehicle history |

## Drivers

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/v1/drivers` | List drivers |
| POST | `/api/v1/drivers` | Create driver |
| GET | `/api/v1/drivers/:id` | Driver details |
| PATCH | `/api/v1/drivers/:id` | Update driver |
| DELETE | `/api/v1/drivers/:id` | Delete/deactivate driver |
| POST | `/api/v1/drivers/:id/documents` | Upload document |

## Assets

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/v1/assets` | List assets |
| POST | `/api/v1/assets` | Create asset |
| GET | `/api/v1/assets/:id` | Asset details |
| PATCH | `/api/v1/assets/:id` | Update asset |
| POST | `/api/v1/assets/:id/assign` | Assign asset |
| POST | `/api/v1/assets/:id/return` | Return asset |
| POST | `/api/v1/assets/:id/transfer` | Transfer asset |
| GET | `/api/v1/assets/:id/history` | Asset history |

## Trips

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/v1/trips` | List trips |
| POST | `/api/v1/trips` | Create trip |
| GET | `/api/v1/trips/:id` | Trip details |
| PATCH | `/api/v1/trips/:id` | Update trip |
| POST | `/api/v1/trips/:id/assign` | Assign vehicle/driver |
| POST | `/api/v1/trips/:id/start` | Start trip |
| POST | `/api/v1/trips/:id/end` | End trip |
| POST | `/api/v1/trips/:id/cancel` | Cancel trip |
| GET | `/api/v1/trips/:id/events` | Trip events |
| GET | `/api/v1/trips/:id/pnl` | Trip P&L |

## Fuel

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/v1/fuel-logs` | List fuel logs |
| POST | `/api/v1/fuel-logs` | Create fuel log |
| GET | `/api/v1/fuel-logs/:id` | View fuel log |
| PATCH | `/api/v1/fuel-logs/:id` | Update fuel log |
| POST | `/api/v1/fuel-logs/:id/approve` | Approve |
| POST | `/api/v1/fuel-logs/:id/reject` | Reject |

## Expenses

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/v1/expenses` | List expenses |
| POST | `/api/v1/expenses` | Create expense |
| POST | `/api/v1/expenses/:id/approve` | Approve |
| POST | `/api/v1/expenses/:id/reject` | Reject |

## Repairs

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/v1/repair-tickets` | List repair tickets |
| POST | `/api/v1/repair-tickets` | Create ticket |
| GET | `/api/v1/repair-tickets/:id` | View ticket |
| PATCH | `/api/v1/repair-tickets/:id` | Update ticket |
| POST | `/api/v1/repair-tickets/:id/assign` | Assign mechanic/vendor |
| POST | `/api/v1/repair-tickets/:id/close` | Close ticket |

## Reports

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/v1/reports/dashboard` | Dashboard stats |
| GET | `/api/v1/reports/trips` | Trip report |
| GET | `/api/v1/reports/fuel` | Fuel report |
| GET | `/api/v1/reports/vehicles/:id/pnl` | Vehicle P&L |
| GET | `/api/v1/reports/exports/:type` | Export report |
