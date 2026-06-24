# Backend and Web Completion Roadmap

## Purpose

This roadmap supersedes the earlier mobile-first sequencing. The React Native/mobile app is intentionally deferred until the backend and web application are complete enough for real operations.

The priority is now:

1. Complete backend business workflows.
2. Complete web/admin/driver/operator workflows.
3. Add notifications, reporting, audit history, storage, and integrations.
4. Harden India-region compliance, privacy, and deployment readiness.
5. Only then reconsider a mobile app.

## Current baseline

Completed and deployed:

- Auth, RBAC, users, roles, permissions
- Vehicle, driver, and asset masters
- Asset assignment and history
- Trip workflow
- Fuel and expense workflow
- Maintenance and repair workflow
- India vehicle compliance and document metadata
- AI Studio-style web shell and UI polish
- GitHub Actions CI gate

In progress:

- Phase 7 Finance and P&L foundation

Deferred:

- React Native driver app
- Real document file upload
- Live GPS/telematics ingestion
- FASTag live transaction sync
- Payment gateway
- Tally/GST/e-way bill integrations

## Roadmap phases before mobile app

### Phase 7: Finance and P&L foundation

Goal: make trip and fleet operations financially trackable.

Required backend and web scope:

- Finance accounts
- Finance categories
- Vendors
- Customers
- Trip billing
- Payments
- Finance transactions
- Finance history
- Finance dashboard
- Vehicle-wise P&L
- Trip-wise P&L
- Driver-wise P&L
- Date-range P&L
- Cost aggregation from fuel, expenses, maintenance, repairs, and compliance

Out of scope for this phase:

- Tally sync
- GST filing
- Payment gateway
- Full accounting software

Acceptance gate:

- Backend finance workflow tests pass
- API docs include all finance endpoints
- Web finance pages work with RBAC
- CI gate is green
- Vercel deploy only after merge and post-merge smoke

---

### Phase 7.1: Driver Operations, Assignment, and Web Notifications

Goal: make drivers real operational users in the web app before building mobile.

Why this is critical:

Drivers currently exist as master data and can have roles, but the product still needs a proper driver workflow. Drivers should log in and see only their assigned trips, trip instructions, vehicle details, compliance warnings, and actions they are allowed to perform.

Backend scope:

- Trip assignment model
- Driver assignment lifecycle:
  - assigned
  - acknowledged
  - accepted
  - rejected
  - reassigned
  - started
  - completed
  - cancelled
- Driver-specific `/me` APIs:
  - `GET /me/trips`
  - `GET /me/trips/:id`
  - `POST /me/trips/:id/acknowledge`
  - `POST /me/trips/:id/accept`
  - `POST /me/trips/:id/reject`
  - `POST /me/trips/:id/start`
  - `POST /me/trips/:id/complete`
- Driver shift/session logs
- Driver availability status
- Driver event history
- Assignment audit trail
- Trip reassignment rules
- Driver cannot see other drivers' trips unless explicitly permitted

Web scope:

- Driver dashboard / My Trips
- Assigned trips queue
- Trip instruction page
- Accept/reject trip actions
- Start/end trip actions
- Vehicle summary for assigned trip
- Compliance warning banner for assigned vehicle
- Driver shift status widget
- Manager dispatch view showing assignment status

Notification scope:

- Notification model
- Notification delivery log
- Notification preferences
- Web notification bell
- Notifications inbox
- Read/unread state
- Assignment notification
- Trip status notification
- Compliance expiry reminder notification
- Maintenance/repair approval notification
- Finance/payment overdue notification after Phase 7 is merged

RBAC additions:

- `trip_assign`
- `trip_accept`
- `trip_reject`
- `driver_my_trips_view`
- `driver_shift_manage`
- `notifications_view`
- `notifications_manage`
- `notification_rules_manage`

Acceptance gate:

- Driver role sees only assigned trips
- Driver cannot access admin-only fleet pages
- Manager/admin can assign and reassign trips
- Notifications are generated for assignment and status events
- Web notification bell and inbox work
- CI gate is green

---

### Phase 7.2: Dispatch, Route Planning, Customer Operations, and Proof of Delivery

Goal: make the trip workflow closer to real logistics operations.

Backend scope:

- Dispatch board APIs
- Trip stops / waypoints
- Loading point and unloading point details
- Consignor and consignee contacts
- Customer-specific trip instructions
- Material/load details
- LR number / lorry receipt metadata
- Challan number metadata
- E-way bill metadata
- GSTIN fields for consignor/consignee/customer
- POD metadata model
- Delivery status timeline
- Delay reason tracking
- Incident reporting

Web scope:

- Dispatch board
- Trip planning page
- Stops/waypoints editor
- Customer/contact panel
- POD metadata section
- Trip issue/incident log
- Dispatch filters by driver, vehicle, route, status, and date

Out of scope:

- Live maps/GPS
- Automatic route optimization
- Real e-way bill API integration

Acceptance gate:

- Dispatchers can plan and assign trips end-to-end
- Driver view receives the assigned trip details
- POD metadata can be recorded
- Trip history captures dispatch and delivery events

---

### Phase 7.3: Reports, Analytics, and Generalized Timeline

Goal: make management reporting and audit history consistent across modules.

Backend scope:

- General domain event model or standardized timeline service
- Report APIs for:
  - fleet utilization
  - vehicle uptime/downtime
  - trip performance
  - driver performance
  - fuel consumption
  - maintenance cost
  - repair cost
  - compliance expiry
  - finance/P&L
  - overdue payments
- Export endpoints for CSV/Excel where safe
- Saved report filters

Web scope:

- Reports dashboard
- Vehicle timeline
- Driver timeline
- Trip timeline
- Finance timeline
- Compliance timeline
- Report filters
- Export actions with RBAC

Acceptance gate:

- Major entities show a readable timeline
- Management reports use real data, not hardcoded placeholders
- Export permissions are enforced

---

### Phase 7.4: Real Document Storage and File Security

Goal: move from metadata-only document handling to secure file storage.

Backend scope:

- Storage provider abstraction
- Stored file registry
- Document file versioning
- Signed upload flow
- Signed download flow
- File size and MIME validation
- File checksum
- Replace file workflow
- Delete/archive file workflow
- Access audit log
- Optional virus scan hook placeholder

Web scope:

- Upload widget
- File preview/download link
- File version history
- Replace document file
- Disabled states by permission

Out of scope unless explicitly approved:

- Public file URLs
- Unrestricted direct uploads
- Permanent unsigned download links

Acceptance gate:

- Files are private by default
- Users can only access files they have permission for
- Metadata and binary file lifecycle are linked safely

---

### Phase 7.5: Integrations Hub

Goal: create the platform layer for external systems without hardcoding vendors into core modules.

Backend scope:

- Integration account model
- Integration provider abstraction
- Integration job log
- Webhook event model
- Retry/idempotency handling
- Provider credential storage pattern using environment/secrets only
- GPS/AIS-140 provider adapter placeholder
- FASTag transaction import placeholder
- WhatsApp/SMS/email provider abstraction
- Tally/accounting export placeholder

Web scope:

- Integrations page
- Provider status cards
- Sync job history
- Manual sync button where safe
- Webhook log viewer
- Notification channel configuration

Acceptance gate:

- No provider secrets are committed
- Integration jobs are auditable
- Failed syncs are visible
- Notification channels can be configured without code changes

---

### Phase 7.6: India Enterprise Hardening, Privacy, and Multi-branch Operations

Goal: prepare the app for serious India-region businesses.

Backend scope:

- Branch/location model
- Vehicle/driver/user branch assignment
- Branch-scoped access controls
- PII masking and reveal logging
- Driver license and personal data access audit
- Retention policy model
- Data export/delete request tracking
- Owner profile enrichment
- Structured permit state/route coverage
- Insurance claim metadata
- PUC measured values
- FASTag blacklisting/recharge/transaction metadata
- AIS-140 heartbeat/device health metadata

Web scope:

- Branch selector / branch filter
- Privacy/admin settings
- PII reveal confirmation flow
- Retention policy page
- Enhanced India compliance forms
- Compliance risk dashboard

Acceptance gate:

- Sensitive data is masked by default where appropriate
- Reveals are logged
- Branch restrictions are enforced
- India compliance data is detailed enough for real audits

## Mobile app policy

Mobile app development is deferred. Do not start React Native work until these backend and web phases are complete and accepted:

1. Phase 7 Finance and P&L
2. Phase 7.1 Driver Operations and Notifications
3. Phase 7.2 Dispatch and POD
4. Phase 7.3 Reports and Timeline
5. Phase 7.4 Real Document Storage
6. Phase 7.5 Integrations Hub
7. Phase 7.6 Privacy, branch, and India enterprise hardening

The driver mobile app should only be built after the web driver portal and driver APIs are proven.

## CLI-AI execution rules

For every phase:

- Start from latest main.
- Create a feature branch.
- Do not push directly to main.
- Do not deploy Vercel during implementation.
- Do not modify mobile.
- Do not print secrets.
- Add/update Prisma models safely.
- Add RBAC permissions and seed repair.
- Add backend API tests.
- Add Playwright tests for core web flows.
- Update OpenAPI/Swagger docs.
- Update evidence docs.
- Wait for GitHub Actions CI gate before merge.
- Deploy only after merge and post-merge smoke.

## Immediate next step after current Phase 7

After Phase 7 Finance and P&L is merged, smoke-tested, and deployed, start:

`phase-7-1-driver-ops-notifications`

Do not start mobile.