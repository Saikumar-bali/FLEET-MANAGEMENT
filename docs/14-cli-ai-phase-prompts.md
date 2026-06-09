# CLI-AI Phase Prompts

Use these prompts with CLI-AI. Copy one phase prompt at a time. Do not ask CLI-AI to do all phases together.

---

## Master Prompt

You are a senior full-stack engineer and architect working on the Fleet Management Platform.

Before coding:

1. Read `README.md`
2. Read `tasks.md`
3. Read `progress.md`
4. Read all docs under `docs/`
5. Understand the current phase
6. Inspect the existing codebase

Rules:

- Complete only the requested phase.
- Do not start future phases.
- Do not rewrite unrelated code.
- Do not hardcode secrets.
- Use clean architecture.
- Add validation and permission checks.
- Add loading/error/empty states in UI.
- Update `progress.md`.
- Provide final verification summary.

---

## Phase 0 Prompt: Project Bootstrap

Pull the latest `main` branch.

Read all documentation files.

Implement Phase 0 only.

Goal:
Create the initial monorepo/project foundation for a Fleet Management Web + Mobile + Backend platform.

Must complete:

1. Create backend app foundation.
2. Create web app foundation.
3. Create mobile app foundation if not already present.
4. Add TypeScript where applicable.
5. Add `.env.example` files.
6. Add clean folder structure.
7. Add basic health API.
8. Add database connection placeholder/config.
9. Add common response/error format.
10. Update `progress.md`.

Do not implement vehicles, trips, fuel, repair, GPS, or Tally.

Verification:
Run install/build/lint where possible and report results.

---

## Phase 1 Prompt: Auth, Roles, Permissions

Pull latest `main`.

Read `README.md`, `tasks.md`, `progress.md`, and docs.

Implement Phase 1 only.

Goal:
Add secure authentication, role-based access control, and permission-based authorization.

Must complete:

1. Users model/table.
2. Roles model/table.
3. Permissions model/table.
4. Role permissions mapping.
5. Seed default roles:
   - super_admin
   - admin
   - manager
   - supervisor
   - driver
   - assistant_driver
   - collector
   - mechanic
   - finance
   - viewer
6. Seed base permissions for:
   - users
   - vehicles
   - drivers
   - assets
   - trips
   - fuel
   - expenses
   - repairs
   - finance
   - reports
   - settings
7. Login API.
8. Current user API.
9. Auth middleware.
10. Permission middleware.
11. Web login page.
12. Protected routes.
13. Permission-aware sidebar.
14. Update `progress.md`.

Do not start vehicle CRUD or trip workflow.

Verification:
Test login, protected route, and permission denial.

---

## Phase 2 Prompt: Vehicle, Driver, Asset Masters

Pull latest branch.

Read all docs and current code.

Implement Phase 2 only.

Goal:
Create master modules for vehicles, drivers, assets, and documents.

Must complete:

1. Vehicle CRUD backend.
2. Driver CRUD backend.
3. Asset category CRUD backend.
4. Asset CRUD backend.
5. File upload foundation for documents/photos.
6. Vehicle list page.
7. Vehicle form.
8. Vehicle details page.
9. Driver list page.
10. Driver form.
11. Driver details page.
12. Asset list page.
13. Asset form.
14. Search/filter/pagination.
15. Loading/error/empty states.
16. Permission checks on all routes and buttons.
17. Update `progress.md`.

Do not start trip workflow.

Verification:
Create, edit, list, and deactivate vehicle/driver/asset.

---

## Phase 3 Prompt: Asset Assignment and History

Pull latest branch.

Read all docs and current code.

Implement Phase 3 only.

Goal:
Track asset assignment, return, transfer, damage, lost status, and history.

Must complete:

1. Asset assignment model/table.
2. Asset history model/table.
3. Assign asset to vehicle.
4. Assign asset to driver/staff.
5. Return asset.
6. Transfer asset.
7. Mark damaged/lost.
8. Upload proof photo.
9. Asset detail history timeline.
10. Prevent invalid double assignment.
11. Permission checks.
12. Update `progress.md`.

Do not start trip workflow.

Verification:
Assign and return an asset. Confirm full history is visible.

---

## Phase 4 Prompt: Trip / Transfer Workflow

Pull latest branch.

Read docs and inspect current code.

Implement Phase 4 only.

Goal:
Build trip creation, assignment, start, end, and status history.

Must complete:

1. Trip model/table.
2. Trip events model/table.
3. Create trip API.
4. Assign vehicle and driver.
5. Start trip API.
6. End trip API.
7. Cancel trip API.
8. Odometer validation.
9. Vehicle status transition.
10. Driver status transition.
11. Trip list page.
12. Trip create page/form.
13. Trip detail page with event timeline.
14. Permission checks.
15. Update `progress.md`.

Do not start fuel or repair unless required for trip structure.

Verification:
Create a trip, start it, end it, and confirm status/history.

---

## Phase 5 Prompt: Fuel and Expense Workflow

Pull latest branch.

Read docs and current code.

Implement Phase 5 only.

Goal:
Add fuel logs, expense logs, bill/proof uploads, calculations, and approvals.

Must complete:

1. Fuel log model/table.
2. Expense category model/table.
3. Trip expense model/table.
4. Fuel log CRUD.
5. Expense CRUD.
6. Fuel calculation:
   - total amount
   - litres
   - rate per litre
7. Bill/proof upload.
8. Approval/rejection APIs.
9. Fuel list page.
10. Expense list page.
11. Pending approval page.
12. Update trip cost after approval.
13. Permission checks.
14. Update `progress.md`.

Do not start repair or finance advanced reports.

Verification:
Submit fuel/expense and approve/reject it.

---

## Phase 6 Prompt: Maintenance and Repair

Pull latest branch.

Read all docs.

Implement Phase 6 only.

Goal:
Build repair tickets, maintenance schedules, and service job workflow.

Must complete:

1. Maintenance schedule model/table.
2. Repair ticket model/table.
3. Service job model/table.
4. Create repair ticket.
5. Assign mechanic/vendor.
6. Add parts/labour cost.
7. Upload before/after photos.
8. Close repair.
9. Vehicle status transition to/from repair.
10. Repair list page.
11. Repair detail page.
12. Maintenance due page.
13. Permission checks.
14. Update `progress.md`.

Verification:
Create repair ticket, complete service job, and close it.

---

## Phase 7 Prompt: Finance and P&L

Pull latest branch.

Read docs and current code.

Implement Phase 7 only.

Goal:
Create finance approval and profit/loss reporting.

Must complete:

1. Collections model/table.
2. Collection entry APIs.
3. Finance approval for collections.
4. Trip P&L calculation.
5. Vehicle P&L calculation.
6. Monthly P&L report.
7. Finance dashboard.
8. Export CSV foundation.
9. Permission checks.
10. Update `progress.md`.

Do not start Tally integration.

Verification:
Show trip-wise and vehicle-wise profit/loss.

---

## Phase 8 Prompt: React Native Driver App

Pull latest branch.

Read docs and current code.

Implement Phase 8 only.

Goal:
Build MVP React Native mobile workflow for drivers.

Must complete:

1. Mobile login.
2. Secure token storage.
3. Driver home.
4. My assigned trip.
5. Trip detail screen.
6. Start trip.
7. End trip.
8. Add fuel.
9. Add expense.
10. Upload photos.
11. API error handling.
12. Loading states.
13. Update `progress.md`.

Do not start advanced tracking.

Verification:
Driver can complete a full trip flow from mobile.

---

## Phase 9 Prompt: Reports, Notifications, Deployment

Pull latest branch.

Read docs and current code.

Implement Phase 9 only.

Goal:
Polish, reporting, notifications, and deployment readiness.

Must complete:

1. Dashboard report API.
2. Trip report.
3. Fuel report.
4. Repair report.
5. Document expiry report.
6. Basic notifications.
7. Deployment configs.
8. Production env docs.
9. Build verification.
10. Update `progress.md`.

Verification:
Build passes and deployment instructions work.
