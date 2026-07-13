# Staff Wallet & Trip Allowance — End-to-End Flow

## Decision

The wallet is attached to an application user, not to a role. Drivers, mechanics, managers, and any future role therefore use the same immutable cash ledger. Driver advance/settlement remains the trip-specific approval workflow layered on top of that wallet.

## Posting rules

| Event | Staff wallet | Company finance account | Business P&L |
|---|---:|---:|---:|
| Advance issued | Credit | Decrease | No effect (transfer) |
| Approved fuel | Debit | No second movement | Fuel expense remains the P&L source |
| Approved expense | Debit | No second movement | Expense record remains the P&L source |
| Cash returned | Debit | Increase | No effect (transfer) |
| Reimbursement | Credit | Decrease | No duplicate expense |
| Carry forward | No movement | No movement | No effect |

All automatic posts have unique idempotency keys, so retrying an approval or settlement cannot post the same wallet movement twice.

## ₹5,000 + ₹15,000 scenario

- `includeExistingBalance=true`: ₹5,000 is applied and only ₹10,000 is issued. Wallet becomes ₹15,000.
- `includeExistingBalance=false`: the full ₹15,000 is issued. Wallet becomes ₹20,000.

`amount` is the trip allowance target. `cashIssuedAmount` is the actual new cash movement, and `existingBalanceApplied` records the amount reused.

## Spend and settlement

Fuel/expense drafts do not reduce cash. Approval is the controlled financial event; it atomically approves the record and debits the matching trip/general advance. If funds are insufficient, approval fails without partially changing either record.

At settlement the user chooses:

- `RETURN`: approved spends plus returned cash must fully account for the allowance. Returned cash is removed from the wallet and credited to the company account.
- `CARRY_FORWARD`: the trip advance closes, but remaining cash stays in the staff wallet for a future allowance.

## Role-neutral endpoints

- `GET /api/v1/me/staff-wallet`
- `GET /api/v1/staff-wallets`
- `GET /api/v1/staff-wallets/:userId`
- `POST /api/v1/staff-wallets/:userId/transactions`

The last endpoint requires a unique reference, reason, direction, and amount and is reserved for finance-authorized adjustments.

## Local proof

Apply migrations, start the backend, then run:

```bash
npm --prefix backend run test:driver-advance-settlement
```

The scenario verifies issue credit, real fuel/expense approval debits, cash return, role-neutral adjustment, ₹5,000 + ₹10,000 allowance composition, and carry-forward closure.
