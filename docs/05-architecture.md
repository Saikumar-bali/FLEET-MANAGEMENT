# Architecture

## High-Level Architecture

```text
Web Dashboard        React Native App
      |                    |
      +---------+----------+
                |
             Backend API
                |
       Business Services Layer
                |
          Database + Storage
                |
       Notifications / Reports
```

## Recommended Backend Structure

```text
backend/
  src/
    config/
    modules/
      auth/
      users/
      roles/
      permissions/
      vehicles/
      drivers/
      assets/
      trips/
      fuel/
      expenses/
      repairs/
      finance/
      reports/
      notifications/
      uploads/
      audit/
    middlewares/
    services/
    utils/
    app.ts
    server.ts
```

## Recommended Web Structure

```text
web/
  src/
    app/
    components/
    layouts/
    pages/
    routes/
    services/
    hooks/
    store/
    utils/
    types/
```

## Recommended Mobile Structure

```text
mobile/
  src/
    screens/
    navigation/
    components/
    services/
    hooks/
    store/
    utils/
    types/
```

## Backend Layers

### Controller

Handles HTTP request and response only.

### Service

Contains business logic.

### Repository/ORM

Handles database access.

### Middleware

Handles auth, permission, validation, and error processing.

## Core Business Rules

- Vehicle can be assigned to only one active trip at a time.
- Driver can be assigned to only one active trip at a time.
- Asset cannot be actively assigned to multiple holders at the same time unless marked as shared.
- Fuel entry must be connected to a vehicle.
- Fuel entry should be connected to a trip when possible.
- Trip cannot be closed without end odometer.
- End odometer must be greater than or equal to start odometer.
- Approved expenses affect P&L.
- Draft/pending expenses should not affect final P&L.
- Every critical status change must create an audit log.

## Status Flow

### Vehicle

```text
available -> on_trip -> available
available -> under_repair -> available
available -> inactive
```

### Trip

```text
draft -> assigned -> started -> completed -> finance_closed
draft -> cancelled
assigned -> cancelled
started -> breakdown
breakdown -> completed
```

### Fuel / Expense

```text
draft -> submitted -> approved
submitted -> rejected
```

### Repair

```text
open -> assigned -> in_progress -> completed -> verified -> closed
open -> cancelled
```

## Security

- Use JWT access token and refresh token.
- Hash passwords.
- Use permission-based middleware.
- Validate every request.
- Never expose internal errors to frontend.
- Store uploads safely.
- Limit file types and sizes.
- Add audit logs for sensitive actions.

## Audit Events

Track:

- Login
- Failed login
- Vehicle create/update/delete
- Driver create/update/delete
- Asset assignment/return
- Trip start/end/cancel
- Fuel approval/rejection
- Expense approval/rejection
- Repair open/close
- Permission changes
