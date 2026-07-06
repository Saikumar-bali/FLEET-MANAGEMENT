# Phase 4 — POD and Billing Chain

## Goal

Complete the operational chain after trip completion:

1. Driver uploads proof of delivery (POD).
2. Admin/manager/supervisor verifies or rejects POD.
3. Verified POD automatically creates a trip billing draft.
4. Finance approves or rejects the billing draft.

## Design Decision

This phase does **not** create duplicate POD or billing tables.

The existing schema already has the correct primitives:

- `Document` with `documentType = TRIP_POD`
- `Document.verificationStatus`
- `TripBilling`
- `FinanceHistory`
- `Notification`

So the POD chain uses the existing enterprise data model.

## Status Chain

```text
Trip COMPLETED
  ↓
Driver uploads Document(TRIP_POD)
  ↓
Document.verificationStatus = PENDING
  ↓
POD verified
  ↓
Document.verificationStatus = VERIFIED
  ↓
TripBilling auto-created with paymentStatus = UNBILLED
  ↓
Finance approves
  ↓
TripBilling.paymentStatus = BILLED
```

Reject paths:

```text
POD rejected → Document.verificationStatus = REJECTED
Billing rejected → TripBilling.paymentStatus = CANCELLED
```

## Backend Endpoints

### Driver POD upload

```http
POST /api/v1/me/driver-trips/:id/pod
```

Permission:

```text
driver_pod_upload
```

Rules:

- User must have linked driver profile.
- Trip must belong to that driver.
- Trip must be `COMPLETED`.
- Duplicate verified POD is blocked.
- Duplicate pending POD is blocked.

### POD chain dashboard

```http
GET /api/v1/pod-billing/chain
```

Permissions accepted:

```text
driver_submission_view
driver_document_verify
documents_verify
trip_billing_view
finance_approve
```

### Verify POD

```http
POST /api/v1/pod-billing/pods/:id/verify
```

Permissions accepted:

```text
driver_document_verify
documents_verify
```

Effect:

- Sets POD to `VERIFIED`.
- Auto-creates `TripBilling` if no billing exists for the trip.
- Creates `FinanceHistory` row.
- Sends finance notification.

### Reject POD

```http
POST /api/v1/pod-billing/pods/:id/reject
```

Effect:

- Sets POD to `REJECTED`.
- Requires reason.
- Notifies linked driver users.

### Approve billing

```http
POST /api/v1/pod-billing/billings/:id/approve
```

Permission:

```text
finance_approve
```

Effect:

- Requires verified POD.
- Sets `TripBilling.paymentStatus = BILLED`.
- Writes `FinanceHistory`.
- Notifies admin/manager.

### Reject billing

```http
POST /api/v1/pod-billing/billings/:id/reject
```

Permission:

```text
finance_approve
```

Effect:

- Requires rejection reason.
- Blocks rejection if already approved or paid.
- Sets `TripBilling.paymentStatus = CANCELLED`.
- Writes `FinanceHistory`.

## Frontend

### Driver Portal

Page:

```text
/driver-portal/trips
```

Completed trips now show:

```text
Upload POD
```

Driver can attach:

- POD file
- receiver name
- receiver mobile
- delivery notes

### Finance POD Chain

Page:

```text
/finance/pod-chain
```

Tab:

```text
Finance → POD Chain
```

Panels:

- POD verification queue
- Finance approval queue
- Verified/rejected POD history

## Scenario Tests To Run

1. Driver cannot upload POD before trip completion.
2. Driver can upload POD after trip completion.
3. Duplicate pending POD is blocked.
4. Duplicate verified POD is blocked.
5. Admin/manager verifies POD.
6. Verified POD auto-creates exactly one billing draft.
7. Finance sees pending billing approval.
8. Finance approves only when verified POD exists.
9. Finance rejection requires reason.
10. POD rejection notifies driver.
11. Finance approval notifies admin/manager.
12. Unauthorized roles cannot verify POD or approve billing.

## Notes

- Billing amount can be generated from `distanceKm × ratePerKm` during POD verification.
- If `freightAmount` is supplied directly, it overrides rate-based freight calculation.
- This phase does not create invoices or payment collection; it prepares the billing approval chain.
