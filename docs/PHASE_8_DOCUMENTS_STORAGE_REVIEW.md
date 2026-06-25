# Phase 8 Documents & Storage - Review Checklist

## Storage
- [x] StorageProvider interface defined
- [x] LocalStorageProvider implemented
- [x] S3StorageProvider fully implemented (not stub)
- [x] Storage service with env-based provider selection (local/s3/r2)
- [x] Configurable signed URL expiry via STORAGE_SIGNED_URL_EXPIRES_SECONDS
- [x] Env validation at startup for s3/r2 (throws if required vars missing)
- [x] `.storage` gitignored
- [x] @aws-sdk/client-s3 and @aws-sdk/s3-request-presigner installed

## R2 Integration
- [x] Cloudflare R2 bucket `fleet-documents` created
- [x] R2 credentials configured in .env
- [x] R2 provider tested: upload, head, signed URL, delete all pass
- [x] storage.service.ts routes s3/r2 to S3StorageProvider
- [x] .env.example updated with all STORAGE_* placeholders
- [x] docs/R2_STORAGE_SETUP.md created

## Database
- [x] 5 enums added (DocumentType, DocumentCategory, LinkedEntityType, DocumentStatus, DocumentVerificationStatus)
- [x] Document model with all required fields, 15 indexes, 10 relations
- [x] Migration applied successfully

## RBAC
- [x] 7 document permissions (view/upload/download/update/delete/verify/archive)
- [x] Default role assignments configured
- [x] DB seeded with document permissions

## Backend
- [x] 9 endpoints with RBAC
- [x] Multer file upload (10MB max, PDF/JPEG/PNG/WebP)
- [x] Linked entity validation (vehicleId/driverId/tripId/customerId/vendorId must exist)
- [x] Dashboard aggregates: totalDocuments, activeDocuments, unverifiedDocuments, expiringDocuments30, expiredDocuments, storageUsageBytes, documentsByCategory, recentDocuments

## Frontend Integration
- [x] LinkedDocumentsPanel reusable component created
- [x] Vehicle detail Documents tab: uses LinkedDocumentsPanel with VEHICLE types
- [x] Driver detail Documents tab: uses LinkedDocumentsPanel with DRIVER types (was placeholder)
- [x] Trip detail Documents tab: uses LinkedDocumentsPanel with TRIP types (was missing)
- [x] Dashboard: document KPI cards (Total, Unverified, Expiring, Expired, Archived)
- [x] Dashboard: Recent Documents table with "View all" link
- [x] Dashboard: Documents quick link
- [x] Documents Vault page: tabs, filters, upload panel, cards, preview modal

## Swagger
- [x] 9 document endpoints documented
- [x] Document schema with all fields
- [x] Multipart upload schema

## Tests
- [x] documents-workflow-test.ts
- [x] rbac-documents-negative-test.ts
- [x] documents.spec.ts (Playwright)
- [x] rbac-documents.spec.ts (Playwright)

## CI
- [x] CI uses STORAGE_PROVIDER=local
- [x] CI runs documents and RBAC tests
- [x] CI runs Playwright E2E

## Verification Commands
- [x] npm run backend:lint — PASS
- [x] npm run backend:build — PASS
- [x] npm --prefix backend run test:api-docs — PASS (126/126)
- [x] npm run web:lint — PASS
- [x] npm run web:build — PASS

## NOT Started
- [ ] Phase 8.1 OCR/AI Extraction
- [ ] Mobile app
- [ ] Vercel deployment
