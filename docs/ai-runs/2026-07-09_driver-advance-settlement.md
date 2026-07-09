# AI Run: Driver Advance & Settlement

Date: 2026-07-09
Branch: `phase-driver-advance-settlement`

## Goal

Implement backend foundation for driver advance and settlement flow:

```text
finance issues advance -> driver spends -> fuel/expense approved -> returned cash recorded -> settlement closed
```

## Files Added

- `backend/prisma/migrations/20260709000000_add_driver_advance_settlement/migration.sql`
- `backend/src/modules/driver-advances/driver-advances.routes.ts`
- `backend/src/modules/driver-advances/driver-advances.controller.ts`
- `backend/src/modules/driver-advances/driver-advances.service.ts`
- `backend/src/modules/driver-advances/driver-advances.transitions.ts`
- `backend/src/modules/driver-advances/driver-advances.validators.ts`
- `backend/scripts/driver-advance-settlement-scenario-test.ts`
- `docs/DRIVER_ADVANCE_SETTLEMENT.md`
- `docs/LOCAL_DRIVER_ADVANCE_SETTLEMENT_SCENARIOS.md`
- `docs/ai-runs/2026-07-09_driver-advance-settlement.md`

## Files Updated

- `backend/src/app.ts`
- `backend/package.json`

## Migration

Created migration:

```text
backend/prisma/migrations/20260709000000_add_driver_advance_settlement/migration.sql
```

Tables:

- `driver_advances`
- `driver_settlements`
- `driver_settlement_lines`
- `driver_settlement_history`

## Permissions Added

Finance/admin:

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

Driver portal:

- `driver_advance_view_own`
- `driver_settlement_view_own`
- `driver_settlement_submit_own`
- `driver_cash_return_submit`

## API Added

Finance/admin:

- `GET /api/v1/driver-advances`
- `POST /api/v1/driver-advances`
- `GET /api/v1/driver-advances/:id`
- `PATCH /api/v1/driver-advances/:id`
- `PATCH /api/v1/driver-advances/:id/issue`
- `PATCH /api/v1/driver-advances/:id/cancel`
- `GET /api/v1/driver-advances/:id/settlements`
- `POST /api/v1/driver-advances/:id/settlements`
- `GET /api/v1/driver-settlements`
- `GET /api/v1/driver-settlements/:id`
- `GET /api/v1/driver-settlements/:id/summary`
- `PATCH /api/v1/driver-settlements/:id/submit`
- `PATCH /api/v1/driver-settlements/:id/review`
- `PATCH /api/v1/driver-settlements/:id/approve`
- `PATCH /api/v1/driver-settlements/:id/settle`
- `PATCH /api/v1/driver-settlements/:id/reject`
- `PATCH /api/v1/driver-settlements/:id/request-changes`
- `PATCH /api/v1/driver-settlements/:id/cancel`

Driver portal:

- `GET /api/v1/me/driver-advances`
- `GET /api/v1/me/driver-advances/:id`
- `GET /api/v1/me/driver-settlements`
- `GET /api/v1/me/driver-settlements/:id`
- `POST /api/v1/me/driver-advances/:id/settlements`
- `PATCH /api/v1/me/driver-settlements/:id/submit`
- `POST /api/v1/me/driver-settlements/:id/cash-return`

## Calculation Implemented

```text
approvedFuelTotal      = sum approved settlement fuel lines
approvedExpenseTotal   = sum approved settlement expense lines
totalApprovedSpend     = approvedFuelTotal + approvedExpenseTotal
settlementTotal        = totalApprovedSpend + returnedCashAmount + adjustmentAmount
balanceDueFromDriver   = max(issuedAmount - settlementTotal, 0)
reimbursementDueDriver = max(settlementTotal - issuedAmount, 0)
```

Advance cash movement uses `FinanceTransaction.transactionType = TRANSFER` and `sourceModule = DRIVER` to avoid P&L double counting.

## Test Script Added

```bash
npm --prefix backend run test:driver-advance-settlement
```

The test covers:

- admin creates advance
- driver cannot create advance
- admin issues advance
- driver views own advance
- approved fuel/expense spends are included
- returned cash is included
- settlement approve/settle flow
- final advance balance is zero

## Verification Commands

Not run in this environment. Run locally:

```bash
npm --prefix backend run prisma:migrate:deploy
npm --prefix backend run prisma:generate
npm run backend:lint
npm run backend:build
npm --prefix backend run test:driver-advance-settlement
```

## Safety

- Vercel deploy: NO
- Mobile modified: NO
- Secrets printed: NO
- GitHub Actions changed: NO
- Web UI pages: NOT implemented in this branch

## Known Gaps

1. Web UI pages for Driver Advances and Driver Settlements are not added yet.
2. OpenAPI spec was not extended for the new endpoints in this pass.
3. The local scenario script must be run after migration against a local database.
4. Full CI/GitHub Actions run was not triggered from this environment.
