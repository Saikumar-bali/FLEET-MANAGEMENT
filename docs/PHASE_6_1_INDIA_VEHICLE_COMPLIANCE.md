# Phase 6.1: India Vehicle Compliance & Document Metadata

## Summary

Implemented India-specific vehicle compliance metadata tracking and document management for fleet vehicles. This phase adds structured compliance data models, CRUD APIs with Zod validation, RBAC-protected routes, history audit trail, and a compliance dashboard UI.

## Architecture

### Backend Models (10 new Prisma models)
- `VehicleRegistrationDetail` — RC registration metadata (one-to-one per vehicle)
- `VehicleInsuranceDetail` — Insurance policy records (one-to-many)
- `VehiclePermitDetail` — Permit records (one-to-many)
- `VehicleFitnessDetail` — Fitness certificate records (one-to-many)
- `VehiclePucDetail` — PUC certificate records (one-to-many)
- `VehicleRoadTaxDetail` — Road tax payment records (one-to-many)
- `VehicleFastagDetail` — FASTag details (one-to-one)
- `VehicleGpsDeviceDetail` — GPS/AIS-140 device details (one-to-one)
- `VehicleComplianceDocument` — Generic cross-type document metadata
- `VehicleComplianceHistory` — Full audit trail for all compliance mutations

### Enums (9 new)
- `InsurancePolicyType`, `PermitType`, `EmissionNorm`, `RoadTaxType`
- `FastagStatus`, `GpsDeviceStatus`
- `ComplianceType`, `ComplianceDocStatus`, `ComplianceHistoryAction`

### RBAC Permission Keys (12 new)
- `vehicle_compliance_view/create/update/delete/verify/renew`
- `document_metadata_view/create/update/delete/verify`
- `compliance_alerts_view`, `compliance_history_view`

### API Endpoints (34 total)
- Dashboard: GET /compliance/dashboard, GET /compliance/alerts/expiring, GET /compliance/alerts/expired
- Registration: GET/PUT /vehicle/:vehicleId/compliance/registration
- Insurance: GET/POST /vehicle/:vehicleId/compliance/insurance, GET/PUT .../insurance/:id
- Permits: GET/POST /vehicle/:vehicleId/compliance/permits, GET/PUT .../permits/:id
- Fitness: GET/POST /vehicle/:vehicleId/compliance/fitness, GET/PUT .../fitness/:id
- PUC: GET/POST /vehicle/:vehicleId/compliance/puc, GET/PUT .../puc/:id
- Road Tax: GET/POST /vehicle/:vehicleId/compliance/road-tax, GET/PUT .../road-tax/:id
- FASTag: GET/PUT /vehicle/:vehicleId/compliance/fastag
- GPS Device: GET/PUT /vehicle/:vehicleId/compliance/gps-device
- Documents: GET /compliance/documents, GET/POST/PUT .../documents, PUT .../documents/:id/verify, PUT .../documents/:id/renew
- History: GET /vehicle/:vehicleId/compliance/history

### Validation
All routes use Zod validation via `validateRequest` middleware:
- Params validated: vehicleId, compliance record IDs, document IDs
- Body validated: create/update schemas for all 7 compliance types, document metadata, verify, renew
- Query validated: compliance document list filters, history filters, alerts days parameter

### Frontend
- VehicleDetailPage: 7 tabs (Overview, Registration, Expiry, Compliance, Documents, History, Status)
- Compliance tab: Full CRUD for insurance, permits, fitness, PUC, road tax, FASTag, GPS
- Documents tab: Create, list, verify/reject compliance documents
- History tab: Read-only audit trail timeline
- ComplianceDashboardPage: Summary cards + expired/expiring document tables
- All inline styles replaced with CSS classes (compliance-section-title, status-dot, compliance-grid, etc.)

## Document Handling
- Metadata-only approach — no real file upload
- `externalFileUrl` is optional metadata field
- `VehicleComplianceDocument` stores document metadata (number, dates, authority, notes)
- Real file upload is deferred to a future phase

## History Tracking
Every compliance mutation (create, update, renew, verify) creates a `VehicleComplianceHistory` entry with:
- Compliance type, entity type, entity ID
- Action (CREATED, UPDATED, RENEWED, VERIFIED, STATUS_CHANGED)
- Old/new values (JSON), remarks
- Created by user reference
