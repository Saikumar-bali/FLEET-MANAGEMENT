# Implementation Phases

## Phase 0: Project Bootstrap

Purpose: Prepare the repository and development standards.

Tasks:

- Create backend project
- Create web project
- Create mobile project
- Add TypeScript
- Add environment files
- Add linting and formatting
- Add basic folder structure
- Add README and docs
- Add database connection

Exit Criteria:

- All apps run locally
- `.env.example` exists
- Project structure is clean
- No secrets are committed

## Phase 1: Auth, Roles, Permissions

Purpose: Build secure access control.

Tasks:

- User model
- Role model
- Permission model
- Role-permission mapping
- Login API
- JWT auth
- Auth middleware
- Permission middleware
- Seed default roles
- Seed default permissions
- Protected route wrapper in web app

Exit Criteria:

- Admin login works
- Permission checks work
- Unauthorized users receive proper errors
- Sidebar/menu respects permissions

## Phase 2: Vehicle, Driver, Asset Masters

Purpose: Build the core master data.

Tasks:

- Vehicle CRUD
- Driver CRUD
- Staff CRUD if separate from drivers
- Asset category CRUD
- Asset CRUD
- Vehicle documents
- Driver documents
- File upload service
- List filters and pagination

Exit Criteria:

- Admin can manage vehicles/drivers/assets
- Documents/photos can be uploaded
- Data table search/filter works
- Audit log records key changes

## Phase 3: Asset Assignment

Purpose: Track who/what owns each asset.

Tasks:

- Assign asset to vehicle
- Assign asset to driver/staff
- Return asset
- Transfer asset
- Damage/lost status
- Asset history timeline
- Photo proof upload

Exit Criteria:

- Asset current holder is visible
- Full asset history is visible
- Asset cannot be double-assigned incorrectly

## Phase 4: Trip / Transfer Workflow

Purpose: Build the main operations flow.

Tasks:

- Trip creation
- Assign vehicle
- Assign driver
- Assign assistant driver
- Source/destination
- Start odometer
- End odometer
- Start trip
- End trip
- Trip status transitions
- Trip event history

Exit Criteria:

- Trip cannot start without vehicle and driver
- Vehicle status changes to `on_trip`
- Driver status changes to `on_trip`
- On trip close, vehicle/driver become available unless repair is opened

## Phase 5: Fuel and Expense Workflow

Purpose: Capture operational cost.

Tasks:

- Fuel log CRUD
- Fuel bill upload
- Auto-calculate total/rate/litre
- Odometer validation
- Expense categories
- Expense entry
- Expense proof upload
- Approval status
- Finance approval

Exit Criteria:

- Fuel calculation is correct
- Expense proof is stored
- Finance can approve/reject
- Trip cost updates after approval

## Phase 6: Maintenance and Repair

Purpose: Manage vehicle service lifecycle.

Tasks:

- Maintenance schedule
- Repair ticket
- Service job card
- Mechanic/vendor assignment
- Parts/labour cost
- Before/after photos
- Repair status
- Maintenance due alerts

Exit Criteria:

- Repair can be created from trip or vehicle
- Repair cost affects vehicle P&L
- Vehicle can be marked under repair

## Phase 7: Finance and P&L

Purpose: Show business value.

Tasks:

- Trip revenue
- Trip expenses
- Collections
- Driver advance
- Vehicle-wise P&L
- Trip-wise P&L
- Monthly reports
- Export CSV/Excel foundation

Exit Criteria:

- Trip profit/loss is calculated
- Vehicle monthly P&L is visible
- Finance approval workflow is respected

## Phase 8: React Native Mobile App

Purpose: Enable field operations.

Tasks:

- Login
- Role-based home
- Driver trip list
- Start trip
- End trip
- Add fuel
- Add expense
- Upload photos
- Supervisor approvals
- Collector collections
- Mechanic repair updates

Exit Criteria:

- Driver can complete trip flow
- Mobile app uses same backend
- Token handling is secure
- Uploads work from mobile

## Phase 9: Reports, Notifications, Deployment

Purpose: Production readiness.

Tasks:

- Dashboard cards
- Report pages
- Export reports
- Notifications
- Deployment
- CI/CD
- Error logging
- Monitoring
- Backup plan

Exit Criteria:

- App can be deployed
- Reports work
- Basic monitoring exists
- Senior review checklist passes
