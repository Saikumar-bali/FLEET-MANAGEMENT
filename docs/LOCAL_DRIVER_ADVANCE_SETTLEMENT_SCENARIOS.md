# Local Driver Advance & Settlement Scenario Tests

Run these only against your local backend and local/staging-safe database.

## 1. Prepare local database

```bash
cd backend
npm run prisma:migrate:deploy
npm run prisma:generate
```

## 2. Start backend

Terminal 1:

```bash
cd backend
npm run dev
```

Expected backend:

```text
http://127.0.0.1:4000
```

## 3. Run automated scenario script

Terminal 2:

Windows PowerShell:

```powershell
$env:API_BASE_URL="http://127.0.0.1:4000"
$env:ADMIN_USERNAME="<your-admin-username>"
$env:ADMIN_PASSWORD="<your-admin-password>"
npm --prefix backend run test:driver-advance-settlement
```

Linux/macOS:

```bash
API_BASE_URL="http://127.0.0.1:4000" \
ADMIN_USERNAME="<your-admin-username>" \
ADMIN_PASSWORD="<your-admin-password>" \
npm --prefix backend run test:driver-advance-settlement
```

Do not paste real passwords into ChatGPT. Only run them locally.

## 4. Expected PASS checks

The scenario script checks:

1. Backend health works.
2. Admin login works.
3. Test driver is created.
4. Test vehicle is created.
5. Driver user is created and linked through UserProfileLink.
6. Driver is blocked from creating an advance.
7. Admin creates driver advance.
8. Admin issues advance.
9. Driver can view own issued advance.
10. Approved fuel and expense spends are seeded.
11. Settlement calculates correctly:
    - advance: `₹5,000`
    - approved fuel: `₹2,500`
    - approved expense: `₹500`
    - returned cash: `₹2,000`
    - balance due from driver: `₹0`
12. Settlement is submitted.
13. Settlement is approved.
14. Settlement is settled.
15. Advance is marked `SETTLED` with zero balance.

## 5. Manual API smoke sequence

Use after login. Replace IDs with real local values.

### Create advance

```http
POST /api/v1/driver-advances
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "driverId": "<driver-id>",
  "vehicleId": "<vehicle-id>",
  "amount": 5000,
  "paymentMode": "CASH",
  "purpose": "Trip diesel/toll/food advance"
}
```

### Issue advance

```http
PATCH /api/v1/driver-advances/<advance-id>/issue
Authorization: Bearer <finance-or-admin-token>
Content-Type: application/json

{
  "paymentMode": "CASH"
}
```

### Driver views own advance

```http
GET /api/v1/me/driver-advances/<advance-id>
Authorization: Bearer <driver-token>
```

### Create settlement

```http
POST /api/v1/driver-advances/<advance-id>/settlements
Authorization: Bearer <finance-or-admin-token>
Content-Type: application/json

{
  "returnedCashAmount": 2000,
  "includeApprovedFuel": true,
  "includeApprovedExpenses": true,
  "notes": "Bills verified against trip cash advance"
}
```

### Submit settlement

```http
PATCH /api/v1/driver-settlements/<settlement-id>/submit
Authorization: Bearer <finance-or-admin-token>
Content-Type: application/json

{}
```

### Approve settlement

```http
PATCH /api/v1/driver-settlements/<settlement-id>/approve
Authorization: Bearer <finance-or-admin-token>
Content-Type: application/json

{
  "reason": "Fuel and toll bills verified"
}
```

### Settle settlement

```http
PATCH /api/v1/driver-settlements/<settlement-id>/settle
Authorization: Bearer <finance-or-admin-token>
Content-Type: application/json

{
  "paymentMode": "CASH"
}
```

### Read summary

```http
GET /api/v1/driver-settlements/<settlement-id>/summary
Authorization: Bearer <finance-or-admin-token>
```

Expected summary for the standard scenario:

```json
{
  "advanceIssuedAmount": 5000,
  "approvedFuelTotal": 2500,
  "approvedExpenseTotal": 500,
  "returnedCashAmount": 2000,
  "totalApprovedSpend": 3000,
  "settlementTotal": 5000,
  "balanceDueFromDriver": 0,
  "reimbursementDueToDriver": 0,
  "status": "SETTLED"
}
```

## 6. Negative scenarios to verify manually

- Driver cannot create `/api/v1/driver-advances`.
- Driver cannot view another driver's advance through `/api/v1/me/driver-advances/:id`.
- Cancelled advance cannot be settled.
- Settled settlement cannot receive new cash return.
- Rejected fuel/expense entries are not included in settlement totals.
- Existing P&L should not double count advance issue as business expense.
