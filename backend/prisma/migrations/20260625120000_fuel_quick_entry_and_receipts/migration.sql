-- AlterEnum: Add FUEL_ENTRY to LinkedEntityType
ALTER TYPE "LinkedEntityType" ADD VALUE 'FUEL_ENTRY';

-- CreateEnum: FuelEntryMode
CREATE TYPE "FuelEntryMode" AS ENUM ('QUICK_AMOUNT', 'FULL_DETAILS', 'RECEIPT_ASSISTED');

-- CreateEnum: ExtractionStatus
CREATE TYPE "ExtractionStatus" AS ENUM ('NOT_REQUIRED', 'PENDING', 'EXTRACTED', 'CONFIRMED', 'FAILED');

-- AlterTable: fuel_entries
ALTER TABLE "fuel_entries"
  ALTER COLUMN "quantity_liters" DROP NOT NULL,
  ALTER COLUMN "price_per_liter" DROP NOT NULL,
  ADD COLUMN "entry_mode" "FuelEntryMode" NOT NULL DEFAULT 'FULL_DETAILS',
  ADD COLUMN "payment_mode" TEXT,
  ADD COLUMN "extraction_status" "ExtractionStatus" NOT NULL DEFAULT 'NOT_REQUIRED',
  ADD COLUMN "extraction_confidence" DECIMAL(5,4),
  ADD COLUMN "extraction_raw_text" TEXT;

-- AlterTable: documents
ALTER TABLE "documents"
  ADD COLUMN "fuel_entry_id" TEXT;

-- CreateIndex: documents fuel_entry_id
CREATE INDEX "documents_fuel_entry_id_idx" ON "documents"("fuel_entry_id");

-- AddForeignKey: documents -> fuel_entries
ALTER TABLE "documents" ADD CONSTRAINT "documents_fuel_entry_id_fkey"
  FOREIGN KEY ("fuel_entry_id") REFERENCES "fuel_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;
