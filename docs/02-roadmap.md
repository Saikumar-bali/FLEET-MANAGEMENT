# Roadmap

## Roadmap Strategy

Because the timeline is tight, build a practical MVP first. Do not try to build a full enterprise product in the first version.

## 3-Week MVP Roadmap

### Week 1: Foundation and Masters

Goal: Create the backend, authentication, core database, and web dashboard foundation.

Deliverables:

- Repo setup
- Backend setup
- Frontend setup
- Database setup
- Auth login
- JWT auth
- Role and permission seed
- Dashboard shell
- Vehicle module
- Driver module
- Asset module
- Asset assignment module

Acceptance:

- Admin can log in
- Admin can create/edit/delete vehicles
- Admin can create/edit/delete drivers
- Admin can create/edit/delete assets
- Admin can assign assets to vehicle/driver
- Every create/update/delete operation is protected by permission middleware

### Week 2: Trips, Fuel, Expenses, Repair

Goal: Build the main business workflows.

Deliverables:

- Trip creation
- Vehicle and driver assignment
- Start trip
- End trip
- Odometer capture
- Fuel log
- Fuel bill upload
- Expense entry
- Expense proof upload
- Repair ticket
- Maintenance schedule
- Basic notifications
- Basic approval status

Acceptance:

- Supervisor can assign trip
- Driver can update trip status
- Fuel amount/litre/rate calculation works
- Expense proof can be uploaded
- Repair ticket can be created
- Trip status changes are recorded in audit log

### Week 3: Mobile App, Reports, Polish, Deployment

Goal: Make the system usable end-to-end.

Deliverables:

- React Native app setup
- Mobile login
- My assigned trip
- Start trip
- End trip
- Add fuel
- Add expense
- Upload photo
- Basic dashboard cards
- Vehicle-wise report
- Trip-wise P&L
- Fuel report
- Deployment guide
- Production-ready environment config

Acceptance:

- Driver can complete a full trip flow from mobile
- Admin can view trip and fuel data on web
- Finance can see basic P&L
- App can be deployed
- Senior review checklist passes

## 90-Day Production Roadmap

### Month 1

- Stable MVP
- Complete web CRUD modules
- Trip/fuel/repair workflow
- Mobile driver flow
- Basic reports

### Month 2

- Advanced approvals
- Notifications
- Better dashboard
- Maps
- Live mobile location
- Offline-first improvements
- More reports
- Role customization UI

### Month 3

- Hardware GPS/Traccar integration
- Multi-branch support
- Advanced P&L
- Vendor/customer modules
- Audit improvements
- Performance optimization
- Production monitoring
- CI/CD
