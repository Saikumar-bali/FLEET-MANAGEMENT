# Phase 8.2 — Fuel Receipts, Quick Entry & Documents UI Redesign

## Evidence Log — 2026-06-25

### Implementation Summary

| Item | Status |
|------|--------|
| Documents UI/UX redesigned | YES |
| Fuel quick entry added | YES |
| Driver can create fuel entry with amount only | YES |
| Price per litre required for driver (quick mode) | NO |
| Fuel receipt upload in fuel form | YES |
| Fuel receipt stored as Document FUEL_BILL | YES |
| Fuel bill linked to vehicle | YES |
| Fuel bill linked to fuel entry | YES |
| Extraction provider | mock (CI default: disabled) |
| Auto-submit from extraction | NO — user must confirm |
| Vercel deploy | NO |
| Mobile | NO |

---

### PART 1 — Documents UI/UX Redesign

- Added "Fuel Bills" tab to Documents Vault
- Added "Type" column to document table with `formatDocType()` helper
- Added documentType filter dropdown (20 options)
- Added professional CSS classes: `.doc-vault-header`, `.doc-type-pill`, hover effects, KPI card animations

### PART 2 — Backend Fuel Entry Modes

**Prisma Schema Changes:**
- Added `FuelEntryMode` enum: `QUICK_AMOUNT`, `FULL_DETAILS`, `RECEIPT_ASSISTED`
- Added `ExtractionStatus` enum: `NOT_REQUIRED`, `PENDING`, `EXTRACTED`, `CONFIRMED`, `FAILED`
- Made `quantityLiters` and `pricePerLiter` nullable on `FuelEntry`
- Added `entryMode`, `paymentMode`, `extractionStatus`, `extractionConfidence`, `extractionRawText` to `FuelEntry`
- Added `fuelEntryId` to `Document` model
- Added `FUEL_ENTRY` to `LinkedEntityType` enum
- Created migration: `20260625120000_fuel_quick_entry_and_receipts`

**Validators:** Discriminated union schema for `QUICK_AMOUNT` (totalAmount required), `FULL_DETAILS` (quantityLiters + pricePerLiter required), `RECEIPT_ASSISTED`.

**Service:** Entry mode validation, conditional total calculation, nullable quantity/price handling.

### PART 3 — Fuel Receipt Upload

- Document upload accepts `fuelEntryId` to link receipt to fuel entry
- Receipt stored as `FUEL_BILL` document type, `FINANCE` category
- Document record linked to vehicle, driver, and fuel entry

### PART 4 — Receipt Extraction Foundation

- Created `fuel-receipt-extraction.service.ts` with provider abstraction
- Providers: `disabled` (default), `mock` (test fixtures), `ocr` (future)
- Mock provider returns simulated extraction with confidence scores
- Extraction results include: fuelStationName, billNumber, fuelDate, totalAmount, quantityLiters, pricePerLiter, vehicleNumber, gstin, paymentMode
- `needsReview: true` always — never auto-submits

### PART 5 — Fuel Entry UI/UX Redesign

- Created `FuelQuickEntryForm.tsx` — driver-friendly form
- QUICK_AMOUNT mode default: large amount input + chip buttons (₹5K/10K/12K/15K/20K)
- FULL_DETAILS mode: quantity + price/litre + calculated total
- Receipt upload with extraction auto-fill (user confirms)
- Vehicle auto-selection for assigned drivers
- Mobile-responsive design
- Created `FuelEntryPage.tsx` wrapper
- Updated App.tsx router to use new component

### PART 6 — Documents Integration

- Fuel Bills tab in Documents Vault filters `documentType=FUEL_BILL`
- Fuel receipt documents linked to vehicle and fuel entry
- Document table shows linked entity labels (not raw IDs)

---

### Verification Commands

| Command | Result |
|---------|--------|
| `npm run backend:lint` | PASS |
| `npm run web:lint` | PASS |
| `npm run web:build` | PASS |
| `npm --prefix backend run test:api-docs` | PASS (126/126) |
| `npm --prefix backend run test:documents` | Requires running server |
| `npm --prefix backend run test:rbac-documents-negative` | Requires running server |
| `npm --prefix backend run test:fuel-expenses` | Requires running server |
| `npm --prefix backend run test:fuel-receipts` | Requires running server |
| Playwright headed | Requires running server |
| CI | Configured in `.github/workflows/ci.yml` |
| Vercel deploy | NO |

### Files Changed

**Backend:**
- `backend/prisma/schema.prisma` — FuelEntry nullable fields, entryMode, Document fuelEntryId, FUEL_ENTRY enum
- `backend/prisma/migrations/20260625120000_fuel_quick_entry_and_receipts/migration.sql` — New migration
- `backend/src/modules/fuel/fuel.validators.ts` — Discriminated union schema
- `backend/src/modules/fuel/fuel.service.ts` — Entry mode handling
- `backend/src/modules/fuel/fuel.controller.ts` — Extract receipt endpoint
- `backend/src/modules/fuel/fuel.routes.ts` — Extract receipt route
- `backend/src/modules/fuel/fuel-receipt-extraction.service.ts` — New extraction service
- `backend/src/modules/documents/documents.types.ts` — fuelEntryId support
- `backend/src/modules/documents/documents.service.ts` — fuelEntryId upload + filter
- `backend/src/docs/openapi.ts` — Fuel entry modes, extract-receipt, fuelEntryId
- `backend/scripts/fuel-receipt-workflow-test.ts` — New test
- `backend/package.json` — test:fuel-receipts script

**Frontend:**
- `web/src/pages/DocumentsPage.tsx` — Fuel Bills tab
- `web/src/pages/FuelEntryPage.tsx` — New fuel entry page
- `web/src/components/fuel/FuelQuickEntryForm.tsx` — New quick entry form
- `web/src/components/documents/DocumentTable.tsx` — Type column
- `web/src/components/documents/DocumentFilters.tsx` — documentType filter
- `web/src/app/App.tsx` — Fuel route update
- `web/src/app/styles.css` — Fuel form styles, document polish
- `web/src/types/auth.ts` — FuelRecord type update
- `web/src/services/api.ts` — extractReceipt function
- `web/e2e/fuel-quick-entry.spec.ts` — New Playwright test
- `web/e2e/documents.spec.ts` — Fuel Bills tab test
- `web/e2e/fixtures/fuel-bill-sample.pdf` — Test fixture

**CI:**
- `.github/workflows/ci.yml` — New CI pipeline
