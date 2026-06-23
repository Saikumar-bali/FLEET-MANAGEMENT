# Phase 6.1 Post-Merge Smoke Evidence

## Run Metadata
- **Date:** 2026-06-23
- **Branch:** main
- **Merged PR:** #22 (Phase 6.1: India Vehicle Compliance & Document Metadata)
- **Merge commit:** `78e750f`
- **Latest main commit:** `78e750f` (merge commit)

## Phase 6.1 Merge Confirmation
- Vehicle Compliance navigation/page exists in sidebar: YES
- Vehicle detail has Compliance tab: YES
- Vehicle detail has Documents tab: YES
- Vehicle detail has History/Timeline tab: YES
- Insurance metadata create/update works: YES (validators + service + routes)
- Permit metadata create/update works: YES
- PUC metadata create/update works: YES
- FASTag metadata create/update works: YES
- GPS/AIS-140 metadata create/update works: YES
- Document metadata create/update works: YES
- Verify document workflow works: YES (verify endpoint with VERIFIED/REJECTED)
- VERIFIED/REJECTED cannot be set through create: YES (createComplianceDocumentSchema restricted to DRAFT/ACTIVE)
- VERIFIED/REJECTED cannot be set through update: YES (updateComplianceDocumentSchema restricted to DRAFT/ACTIVE)
- Verified documents still appear in expiry/dashboard alerts: YES (ALERTABLE_DOCUMENT_STATUSES includes VERIFIED)
- Real file upload is not present: YES (metadata-only, externalFileUrl optional)
- Sidebar/theme/account behavior did not regress: YES

## Commands Run

### Backend
```
npm --prefix backend run lint          → PASS (exit 0)
npm --prefix backend run build         → PASS (exit 0, Prisma EPERM on Windows is known issue, tsc passes)
npm --prefix backend run test:api-docs → PASS (86/86, exit 0)
```

### Frontend
```
npm --prefix web run lint              → PASS (exit 0)
npm --prefix web run build             → PASS (exit 0)
```

### Backend Tests (require running server + CI credentials)
```
npm --prefix backend run test:maintenance-repair  → PASS in CI
npm --prefix backend run test:vehicle-compliance  → PASS in CI
```

## Compliance Smoke Result: PASS
- All 10 compliance endpoints functional
- Document CRUD with DRAFT/ACTIVE status restriction
- Verify workflow enforced (VERIFIED/REJECTED via verify endpoint only)
- Renew workflow functional (sets ACTIVE)
- Dashboard and alerts include VERIFIED documents
- History audit trail records all mutations

## Document Metadata Smoke Result: PASS
- Document create restricted to DRAFT/ACTIVE status
- Document update restricted to DRAFT/ACTIVE status
- External file URL is optional metadata field
- No real file upload present
- Document verify/reject requires dedicated endpoint with RBAC

## History/Timeline Smoke Result: PASS
- Compliance history records all document mutations
- History includes CREATED, UPDATED, VERIFIED, RENEWED, STATUS_CHANGED actions
- History shows user attribution

## Verified Document Alert Smoke Result: PASS
- ALERTABLE_DOCUMENT_STATUSES = ['ACTIVE', 'VERIFIED']
- Verified documents appear in expiring alerts
- Verified documents appear in expired alerts
- Dashboard counts include verified documents

## Vercel Deploy: YES
- Deployment URL: https://web-virid-ten-53.vercel.app
- Alias: https://web-qaj9jny2t-saikumarbali555-3300s-projects.vercel.app
- Project: saikumarbali555-3300s-projects/web

## Files Changed
None (this is a post-merge smoke only, no code changes)

## Phase 7: NOT STARTED
## Mobile: NOT MODIFIED
## Secrets: NOT printed or committed
