# Phase 8: Documents & Storage Foundation

## Summary

Phase 8 implements a professional Documents module with file upload, storage abstraction, RBAC-controlled access, and a complete frontend UI for managing fleet documents.

## Storage Architecture

- **Provider abstraction**: `StorageProvider` interface with local and S3 provider implementations
- **Local dev storage**: Files stored under `backend/.storage/uploads/` (gitignored)
- **Production**: Designed for S3/R2/Supabase storage via env `STORAGE_PROVIDER`
- **Env vars**: `STORAGE_PROVIDER`, `STORAGE_BUCKET`, `STORAGE_REGION`, `STORAGE_ENDPOINT`, `STORAGE_ACCESS_KEY_ID`, `STORAGE_SECRET_ACCESS_KEY`

## Database Models

### New Enums
- `DocumentType`: 24 document types (VEHICLE_RC, DRIVER_LICENSE, TRIP_POD, INVOICE, GENERAL, etc.)
- `DocumentCategory`: 10 categories (VEHICLE, DRIVER, TRIP, COMPLIANCE, FINANCE, etc.)
- `LinkedEntityType`: 10 entity types for polymorphic linking
- `DocumentStatus`: ACTIVE, ARCHIVED, DELETED
- `DocumentVerificationStatus`: PENDING, VERIFIED, REJECTED

### Document Model
- Full metadata: title, description, originalFileName, storedFileName, mimeType, fileSizeBytes
- Storage fields: storageProvider, storageBucket, storageKey, checksumSha256
- Classification: documentType, documentCategory, linkedEntityType/Id
- Entity linking: vehicleId, driverId, tripId, customerId, vendorId, financeTransactionId, tripBillingId, maintenanceRequestId, repairId
- Dates: issueDate, expiryDate
- Status: documentStatus, verificationStatus, tags, metadata
- Audit: uploadedById, verifiedById, verifiedAt, archivedAt, deletedAt
- 15 database indexes for performance

### Migration
- File: `backend/prisma/migrations/20260625000000_phase_8_documents_storage/migration.sql`
- Drops old Document table, creates new with all enums and indexes

## RBAC Permissions

### New Permission Keys
- `documents_view`, `documents_upload`, `documents_download`, `documents_update`, `documents_delete`, `documents_verify`, `documents_archive`

### Role Assignments
| Role | Permissions |
|------|-------------|
| super_admin | All |
| admin | All except role_delete |
| manager | view, upload, download, update, delete, verify, archive |
| supervisor | view, upload, download |
| driver | None (restricted) |
| assistant_driver | None (restricted) |
| mechanic | view, upload, download (maintenance/repair context) |
| finance | view, upload, download, update, archive |
| viewer | view only |

## API Endpoints

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| GET | /api/v1/documents | documents_view | List documents with filters |
| POST | /api/v1/documents/upload | documents_upload | Upload document (multipart/form-data) |
| GET | /api/v1/documents/:id | documents_view | Get document details |
| GET | /api/v1/documents/:id/view | documents_download | View document |
| GET | /api/v1/documents/:id/download | documents_download | Download document |
| PUT | /api/v1/documents/:id | documents_update | Update document metadata |
| POST | /api/v1/documents/:id/verify | documents_verify | Verify/reject document |
| POST | /api/v1/documents/:id/archive | documents_archive | Archive document |
| DELETE | /api/v1/documents/:id | documents_delete | Soft delete document |

## Frontend Components

- `DocumentsPage.tsx` - Main documents vault page with tabs and filters
- `DocumentUploadPanel.tsx` - Drag-and-drop upload with metadata form
- `DocumentList.tsx` - Grid view of document cards
- `DocumentCard.tsx` - Individual document card with actions
- `DocumentFilters.tsx` - Search, category, status, verification, expiry filters
- `DocumentPreviewModal.tsx` - Document detail preview modal
- `DocumentStatusBadge.tsx` - Status and verification badges

## Validation

- File types: PDF, JPEG, PNG, WebP only
- Max file size: 10MB
- Blocked extensions: exe, bat, cmd, vbs, ps1, etc.
- Required fields: title, documentType, documentCategory
- Safe filename sanitization
- Path traversal prevention

## Files Changed

### Backend
- `backend/src/lib/storage/storage.types.ts` (new)
- `backend/src/lib/storage/storage.service.ts` (new)
- `backend/src/lib/storage/local-storage.provider.ts` (new)
- `backend/src/lib/storage/s3-storage.provider.ts` (new)
- `backend/src/modules/documents/documents.types.ts` (new)
- `backend/src/modules/documents/documents.validators.ts` (rewritten)
- `backend/src/modules/documents/documents.service.ts` (rewritten)
- `backend/src/modules/documents/documents.controller.ts` (rewritten)
- `backend/src/modules/documents/documents.routes.ts` (rewritten)
- `backend/src/constants/rbac.ts` (updated)
- `backend/prisma/schema.prisma` (updated)
- `backend/prisma/migrations/20260625000000_phase_8_documents_storage/migration.sql` (new)
- `backend/src/docs/openapi.ts` (updated)
- `backend/scripts/documents-workflow-test.ts` (new)
- `backend/scripts/rbac-documents-negative-test.ts` (new)
- `backend/package.json` (updated)
- `backend/.gitignore` (updated)

### Frontend
- `web/src/pages/DocumentsPage.tsx` (new)
- `web/src/components/documents/DocumentUploadPanel.tsx` (new)
- `web/src/components/documents/DocumentList.tsx` (new)
- `web/src/components/documents/DocumentCard.tsx` (new)
- `web/src/components/documents/DocumentFilters.tsx` (new)
- `web/src/components/documents/DocumentPreviewModal.tsx` (new)
- `web/src/components/documents/DocumentStatusBadge.tsx` (new)
- `web/src/config/navigation.ts` (updated)
- `web/src/app/App.tsx` (updated)
- `web/src/components/Sidebar.tsx` (updated)
- `web/src/types/auth.ts` (updated)
- `web/src/services/api.ts` (updated)
- `web/e2e/documents.spec.ts` (new)
- `web/e2e/rbac-documents.spec.ts` (new)

### CI
- `.github/workflows/ci.yml` (updated)

## Status

- Phase 8 Documents & Storage: Submitted for Review
- Phase 8.1 OCR/AI Extraction: Not Started
- Mobile: Deferred
