# Driver Advance & Settlement Workflow

## Status

Complete module pass on branch `phase-driver-advance-settlement`.

## Business Flow

1. Finance creates a driver advance draft for a driver, optionally linked to vehicle, trip, finance account, and due date.
2. Finance submits the advance for approval.
3. Manager/finance approves, rejects, or sends the advance back for changes.
4. Finance issues only approved advances. Issue creates a `TRANSFER` finance transaction and updates account balance when an account is selected.
5. Driver travels and submits fuel/expense spends through existing driver portal fuel and expense flows.
6. Manager/finance reviews those fuel and expense submissions through the existing driver submission review workflow.
7. Driver or finance creates a settlement against the issued advance.
8. Settlement pulls approved fuel and expense spends for the same driver/vehicle/trip scope, excluding spends already settled elsewhere.
9. Driver or finance records returned cash.
10. Finance submits/reviews/approves/settles the settlement.
11. The system updates advance settled amount, returned amount, outstanding balance, overdue state, or reimbursement due to driver.
12. If an issued/partially-settled advance is cancelled before active settlement, the outstanding cash balance is reversed back into finance through a transfer transaction.

## Calculation

```text
approvedFuelTotal      = sum(APPROVED fuel_entries.total_amount)
approvedExpenseTotal   = sum(APPROVED expenses.amount)
totalApprovedSpend     = approvedFuelTotal + approvedExpenseTotal
settlementTotal        = totalApprovedSpend + returnedCashAmount + adjustmentAmount
balanceDueFromDriver   = max(issuedAmount - settlementTotal, 0)
reimbursementDueDriver = max(settlementTotal - issuedAmount, 0)
```

Only one of `balanceDueFromDriver` and `reimbursementDueToDriver` should be positive.

## P&L Treatment

Advance issue is cash movement, not final business expense.

Fuel and expense modules already contribute to P&L. Advance issue, return, reversal, and reimbursement use `TRANSFER` finance transactions with `sourceModule='DRIVER'` to avoid double counting fuel/expense costs.

## Data Integrity Rules

- Advance cannot be issued unless status is `APPROVED`.
- Draft/needs-changes advances can be edited.
- Submitted advances can be approved, rejected, or returned for changes.
- Driver cannot have duplicate active/outstanding advances.
- Issued advance cancellation reverses outstanding cash balance into the finance account when account is present.
- Only one active settlement can exist per advance.
- Fuel/expense lines are excluded after they are attached to a settlement.
- Driver portal endpoints are scoped to the authenticated user's linked driver profile.
- Due date is stored on advance and overdue filtering/reporting is supported.

## Tables

Created or extended through migrations:

- `driver_advances`
- `driver_settlements`
- `driver_settlement_lines`
- `driver_settlement_history`

Lifecycle columns added to `driver_advances`:

- `due_date`
- `submitted_at`
- `approved_at`
- `reviewed_at`
- `approved_by_id`
- `reviewed_by_id`
- `review_comments`

## Permissions

Finance/admin side:

- `driver_advance_view`
- `driver_advance_create`
- `driver_advance_update`
- `driver_advance_submit`
- `driver_advance_review`
- `driver_advance_approve`
- `driver_advance_issue`
- `driver_advance_cancel`
- `driver_advance_report`
- `driver_settlement_view`
- `driver_settlement_create`
- `driver_settlement_review`
- `driver_settlement_approve`
- `driver_settlement_settle`
- `driver_settlement_cancel`

Driver portal side:

- `driver_advance_view_own`
- `driver_settlement_view_own`
- `driver_settlement_submit_own`
- `driver_cash_return_submit`

## API Endpoints

Finance/admin:

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/v1/driver-advances` | List advances, including overdue filter |
| GET | `/api/v1/driver-advances/reports/summary` | Aggregate totals and driver-wise outstanding report |
| POST | `/api/v1/driver-advances` | Create draft advance |
| GET | `/api/v1/driver-advances/:id` | Read advance with settlements/history |
| PATCH | `/api/v1/driver-advances/:id` | Update draft/needs-changes advance |
| PATCH | `/api/v1/driver-advances/:id/submit` | Submit advance for approval |
| PATCH | `/api/v1/driver-advances/:id/approve` | Approve advance |
| PATCH | `/api/v1/driver-advances/:id/reject` | Reject advance |
| PATCH | `/api/v1/driver-advances/:id/request-changes` | Send advance back for correction |
| PATCH | `/api/v1/driver-advances/:id/issue` | Issue approved advance |
| PATCH | `/api/v1/driver-advances/:id/cancel` | Cancel advance and reverse outstanding issued cash if required |
| GET | `/api/v1/driver-advances/:id/settlements` | List settlements for advance |
| POST | `/api/v1/driver-advances/:id/settlements` | Create settlement |
| GET | `/api/v1/driver-settlements` | List settlements |
| GET | `/api/v1/driver-settlements/:id` | Read settlement with lines/history |
| GET | `/api/v1/driver-settlements/:id/summary` | Settlement summary |
| PATCH | `/api/v1/driver-settlements/:id/submit` | Submit settlement |
| PATCH | `/api/v1/driver-settlements/:id/review` | Mark under review |
| PATCH | `/api/v1/driver-settlements/:id/approve` | Approve settlement |
| PATCH | `/api/v1/driver-settlements/:id/settle` | Close settlement |
| PATCH | `/api/v1/driver-settlements/:id/reject` | Reject settlement |
| PATCH | `/api/v1/driver-settlements/:id/request-changes` | Request changes |
| PATCH | `/api/v1/driver-settlements/:id/cancel` | Cancel settlement |

Driver portal:

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/v1/me/driver-advances` | View own advances |
| GET | `/api/v1/me/driver-advances/:id` | View own advance |
| GET | `/api/v1/me/driver-settlements` | View own settlements |
| GET | `/api/v1/me/driver-settlements/:id` | View own settlement |
| POST | `/api/v1/me/driver-advances/:id/settlements` | Create own settlement from own advance |
| PATCH | `/api/v1/me/driver-settlements/:id/submit` | Submit own settlement |
| POST | `/api/v1/me/driver-settlements/:id/cash-return` | Add returned cash |

## Web UI

Finance:

- `/finance/driver-advances`
- `/finance/driver-settlements`

Driver portal:

- `/driver-portal/advances`

The finance layout includes tabs for driver advances and settlements. The driver portal layout includes an Advances tab for own balances, settlements, and cash return submission.

## Example Scenario

Finance creates advance `₹5,000`, submits, approves, and issues it.

Approved spends:

- Fuel: `₹2,500`
- Toll/expense: `₹500`

Driver returns cash: `₹2,000`

Result:

```text
issued advance:        5000
approved spend:        3000
returned cash:         2000
balance from driver:      0
reimbursement due:        0
advance status:       SETTLED
```

## Local Test Script

```bash
npm --prefix backend run test:driver-advance-settlement
```

This test creates isolated prefixed test data, verifies driver cannot create an advance, creates/submits/approves/issues an advance, blocks duplicate active advance, seeds approved fuel/expense spends, creates a settlement, approves it, settles it, verifies final balance is zero, and checks the aggregate report endpoint.
