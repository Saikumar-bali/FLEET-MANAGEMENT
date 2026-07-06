# Phase 5 — Invoice & Payment Closure

## Goal

Continue from Phase 4 after finance approves a billing draft.

Phase 4 completed:

```text
Trip completed → POD uploaded → POD verified → Billing approved
```

Phase 5 starts after that:

```text
Billing approved → Payment collection → Partial/full payment tracking → Financial close
```

## Scope Implemented

### Toast UX fix

Added missing success/failure toast notifications to:

- Driver Portal trip actions
- Driver POD upload
- Finance POD verification
- POD rejection
- Billing approval
- Billing rejection

### Payment Closure UI

Added a dedicated closure workflow inside Finance → Payments:

```text
/finance/payments?view=closure
```

The Finance tab shows it as:

```text
Payment Closure
```

This page is designed for finance users who should not manually copy billing IDs into the generic payment form.

## Payment Closure Flow

```text
Approved billing / partially-paid billing
↓
Finance selects billing
↓
Outstanding amount auto-fills
↓
Finance records payment
↓
Backend updates billing:
   PARTIALLY_PAID or PAID
↓
Finance sees recent payment trail
```

## Current Behavior Reused From Existing Backend

The existing finance backend already supports:

- Creating payments
- Linking payment to `tripBillingId`
- Updating `paidAmount`
- Updating `balanceAmount`
- Moving status to `PARTIALLY_PAID` or `PAID`
- Preventing payment beyond receivable balance
- Preventing payment for cancelled billing

So this phase intentionally does **not** duplicate backend payment logic.

## Payment Proof Metadata

The new UI captures proof/reference fields already supported by the backend:

- Payment mode
- Account
- Reference number
- Bank UTR number
- UPI reference
- Notes / proof details

## What This Phase Does Not Yet Do

These are future improvements, not included in this first closure layer:

- PDF invoice generation
- File upload for payment proof attachment
- Dedicated reconciliation approve/reject endpoint
- Accounting ledger export
- Customer statement PDF

## Manual Test Checklist

1. Approve a billing from POD Chain.
2. Open Finance → Payment Closure.
3. Confirm the billing appears in collection queue.
4. Select billing.
5. Confirm outstanding amount auto-fills.
6. Record partial payment.
7. Confirm billing status becomes `PARTIALLY_PAID`.
8. Record remaining payment.
9. Confirm billing status becomes `PAID`.
10. Try payment above balance and confirm backend blocks it.
11. Confirm toast appears for success and failure paths.
