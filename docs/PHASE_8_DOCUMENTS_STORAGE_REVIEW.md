# Phase 8 Documents & Storage - Review Checklist

## Storage
- [x] StorageProvider interface defined
- [x] LocalStorageProvider implemented
- [x] S3StorageProvider stub created
- [x] Storage service with env-based provider selection
- [x] `.storage` gitignored

## Database
- [x] New enums added (DocumentType, DocumentCategory, LinkedEntityType, DocumentStatus, DocumentVerificationStatus)
- [x] Document model rewritten with all required fields
- [x] Relations added to Vehicle, Driver, Trip, Customer, Vendor, FinanceTransaction, TripBilling, MaintenanceRequest, Repair, User
- [x] 15 indexes created
- [x] Migration SQL file created
- [x] Schema validates

## RBAC
- [x] 7 new document permissions added
- [x] Default role assignments configured
- [x] Driver/assistant_driver restricted from global documents
- [x] Viewer limited to read-only
- [x] Backend enforces permissions on all endpoints

## Backend
- [x] Multer installed for file uploads
- [x] File type validation (PDF, JPEG, PNG, WebP)
- [x] File size validation (10MB max)
- [x] Blocked extensions enforced
- [x] Document number generation (DOC-YYYYMMDD-xxxx)
- [x] Filename sanitization
- [x] Upload endpoint with multipart/form-data
- [x] View/download endpoints with permission checks
- [x] Verify endpoint
- [x] Archive endpoint
- [x] Soft delete (no hard delete)
- [x] Audit logging on all mutations
- [x] RBAC enforced on all endpoints

## Frontend
- [x] Documents page with tabs (All, Vehicles, Drivers, Trips, Compliance, Finance, Expiring, Archived)
- [x] Upload panel with drag-and-drop
- [x] Document cards with status badges
- [x] Filters (search, category, status, verification, expiry)
- [x] Preview modal
- [x] Download action
- [x] Archive action
- [x] Delete action
- [x] Sidebar navigation item
- [x] Permission-gated routing

## Swagger
- [x] Document schema updated
- [x] Upload endpoint documented (multipart/form-data)
- [x] All 9 endpoints documented
- [x] Response schemas included
- [x] Auth requirements specified

## Tests
- [x] documents-workflow-test.ts
- [x] rbac-documents-negative-test.ts
- [x] documents.spec.ts (Playwright)
- [x] rbac-documents.spec.ts (Playwright)

## CI
- [x] Documents API tests added
- [x] Documents RBAC tests added
- [x] CI uses local storage (no production credentials needed)

## Security
- [x] No real .env committed
- [x] No uploaded files committed
- [x] No storage credentials committed
- [x] No secrets printed
- [x] Backend enforces RBAC (not just frontend hiding)
- [x] No path traversal possible
- [x] Filenames sanitized
- [x] Content-Type set correctly
- [x] Content-Disposition for downloads

## NOT Started
- [ ] Phase 8.1 OCR/AI Extraction
- [ ] Mobile app
- [ ] Vercel deployment
