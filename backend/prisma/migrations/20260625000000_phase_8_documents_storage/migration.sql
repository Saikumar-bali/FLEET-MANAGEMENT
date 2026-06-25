-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('VEHICLE_RC', 'VEHICLE_INSURANCE', 'VEHICLE_PERMIT', 'VEHICLE_FITNESS', 'VEHICLE_PUC', 'ROAD_TAX', 'FASTAG', 'AIS140_GPS', 'DRIVER_LICENSE', 'DRIVER_ID_PROOF', 'TRIP_POD', 'TRIP_CHALLAN', 'TRIP_LR', 'TRIP_EWAY_BILL', 'CUSTOMER_PO', 'INVOICE', 'PAYMENT_PROOF', 'FUEL_BILL', 'EXPENSE_BILL', 'MAINTENANCE_BILL', 'REPAIR_BILL', 'VENDOR_DOCUMENT', 'CUSTOMER_DOCUMENT', 'GENERAL');

-- CreateEnum
CREATE TYPE "DocumentCategory" AS ENUM ('VEHICLE', 'DRIVER', 'TRIP', 'COMPLIANCE', 'FINANCE', 'MAINTENANCE', 'REPAIR', 'VENDOR', 'CUSTOMER', 'GENERAL');

-- CreateEnum
CREATE TYPE "LinkedEntityType" AS ENUM ('VEHICLE', 'DRIVER', 'TRIP', 'CUSTOMER', 'VENDOR', 'FINANCE_TRANSACTION', 'TRIP_BILLING', 'MAINTENANCE_REQUEST', 'REPAIR', 'GENERAL');

-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('ACTIVE', 'ARCHIVED', 'DELETED');

-- CreateEnum
CREATE TYPE "DocumentVerificationStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED');

-- DropTable (old Document table)
DROP TABLE "documents";

-- CreateTable
CREATE TABLE "documents" (
    "id" TEXT NOT NULL,
    "document_number" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "original_file_name" TEXT NOT NULL,
    "stored_file_name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "file_size_bytes" INTEGER NOT NULL,
    "file_extension" TEXT,
    "storage_provider" TEXT NOT NULL DEFAULT 'local',
    "storage_bucket" TEXT,
    "storage_key" TEXT NOT NULL,
    "checksum_sha256" TEXT,
    "document_type" "DocumentType" NOT NULL,
    "document_category" "DocumentCategory" NOT NULL,
    "linked_entity_type" "LinkedEntityType",
    "linked_entity_id" TEXT,
    "vehicle_id" TEXT,
    "driver_id" TEXT,
    "trip_id" TEXT,
    "customer_id" TEXT,
    "vendor_id" TEXT,
    "finance_transaction_id" TEXT,
    "trip_billing_id" TEXT,
    "maintenance_request_id" TEXT,
    "repair_id" TEXT,
    "issue_date" TIMESTAMP(3),
    "expiry_date" TIMESTAMP(3),
    "document_status" "DocumentStatus" NOT NULL DEFAULT 'ACTIVE',
    "verification_status" "DocumentVerificationStatus" NOT NULL DEFAULT 'PENDING',
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "metadata" JSONB,
    "uploaded_by_id" TEXT NOT NULL,
    "verified_by_id" TEXT,
    "verified_at" TIMESTAMP(3),
    "archived_at" TIMESTAMP(3),
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "documents_document_number_key" ON "documents"("document_number");

-- CreateIndex
CREATE INDEX "documents_document_type_idx" ON "documents"("document_type");

-- CreateIndex
CREATE INDEX "documents_document_category_idx" ON "documents"("document_category");

-- CreateIndex
CREATE INDEX "documents_linked_entity_type_linked_entity_id_idx" ON "documents"("linked_entity_type", "linked_entity_id");

-- CreateIndex
CREATE INDEX "documents_vehicle_id_idx" ON "documents"("vehicle_id");

-- CreateIndex
CREATE INDEX "documents_driver_id_idx" ON "documents"("driver_id");

-- CreateIndex
CREATE INDEX "documents_trip_id_idx" ON "documents"("trip_id");

-- CreateIndex
CREATE INDEX "documents_customer_id_idx" ON "documents"("customer_id");

-- CreateIndex
CREATE INDEX "documents_vendor_id_idx" ON "documents"("vendor_id");

-- CreateIndex
CREATE INDEX "documents_expiry_date_idx" ON "documents"("expiry_date");

-- CreateIndex
CREATE INDEX "documents_uploaded_by_id_idx" ON "documents"("uploaded_by_id");

-- CreateIndex
CREATE INDEX "documents_document_status_idx" ON "documents"("document_status");

-- CreateIndex
CREATE INDEX "documents_verification_status_idx" ON "documents"("verification_status");

-- CreateIndex
CREATE INDEX "documents_created_at_idx" ON "documents"("created_at");

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_uploaded_by_id_fkey" FOREIGN KEY ("uploaded_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_verified_by_id_fkey" FOREIGN KEY ("verified_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_finance_transaction_id_fkey" FOREIGN KEY ("finance_transaction_id") REFERENCES "finance_transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_trip_billing_id_fkey" FOREIGN KEY ("trip_billing_id") REFERENCES "trip_billings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_maintenance_request_id_fkey" FOREIGN KEY ("maintenance_request_id") REFERENCES "maintenance_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_repair_id_fkey" FOREIGN KEY ("repair_id") REFERENCES "repairs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
