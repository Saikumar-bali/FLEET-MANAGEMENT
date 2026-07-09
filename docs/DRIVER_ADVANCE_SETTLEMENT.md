# Driver Advance & Settlement Workflow

## Status

Submitted for review on branch `phase-driver-advance-settlement`.

## Business Flow

1. Finance creates a driver advance for a driver, optionally linked to a vehicle and trip.
2. Finance issues the advance. The system records the issued amount and creates a finance transfer transaction linked to the advance.
3. Driver travels and submits fuel/expense spends through existing driver portal fuel and expense flows.
4. Manager/finance reviews those fuel and expense submissions through the existing driver submission review workflow.
5. A driver settlement is created against the issued advance.
6. The settlement pulls approved fuel and approved expense spends for the same driver/vehicle/trip scope.
7. Driver or finance records returned cash.
8. Finance approves and settles the settlement.
9. The system updates the advance with settled amount, returned amount, balance due from driver, or reimbursement due to driver.

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

Fuel and expense modules already contribute to P&L. The settlement uses `TRANSFER` finance transactions for advance cash movement and returned cash to avoid double counting fuel/expense costs as both expenses and finance transactions.

## Tables

Created through migration:

- `driver_advances`
- `driver_settlements`
- `driver_settlement_lines`
- `driver_settlement_history`

## Permissions

Finance/admin side:

- `driver_advance_view`
- `driver_advance_create`
- `driver_advance_update`
- `driver_advance_issue`
- `driver_advance_cancel`
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
| GET | `/api/v1/driver-advances` | List advances |
| POST | `/api/v1/driver-advances` | Create draft advance |
| GET | `/api/v1/driver-advances/:id` | Read advance |
| PATCH | `/api/v1/driver-advances/:id` | Update draft advance |
| PATCH | `/api/v1/driver-advances/:id/issue` | Issue advance |
| PATCH | `/api/v1/driver-advances/:id/cancel` | Cancel advance |
| GET | `/api/v1/driver-advances/:id/settlements` | List settlements for advance |
| POST | `/api/v1/driver-advances/:id/settlements` | Create settlement |
| GET | `/api/v1/driver-settlements` | List settlements |
| GET | `/api/v1/driver-settlements/:id` | Read settlement |
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

## Example Scenario

Finance gives driver `₹5,000` advance.

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

This test creates isolated prefixed test data, verifies driver cannot create an advance, issues an advance, seeds approved fuel/expense spends, creates a settlement, approves it, settles it, and verifies the final balance is zero.

## Known Scope

This branch adds backend API, database migration, permissions, audit/history, and local scenario test coverage.

The web UI pages are not implemented in this branch yet. Add them after backend scenario tests pass.
