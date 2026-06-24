-- AlterTable: Add India-native fields to customers, vendors, trip_billings, payment_records
-- This migration is idempotent (safe to run on both fresh and existing databases)

-- === customers ===
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "customer_code" TEXT;
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "legal_name" TEXT;
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "trade_name" TEXT;
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "customer_type" TEXT DEFAULT 'INDIVIDUAL';
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "pan" TEXT;
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "state" TEXT;
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "state_code" TEXT;
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "pincode" TEXT;
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "contact_person_name" TEXT;
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "contact_person_phone" TEXT;
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "payment_terms_days" INTEGER DEFAULT 30;
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "credit_limit" DECIMAL(12,2) DEFAULT 0;
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "is_gst_registered" BOOLEAN DEFAULT false;

-- === vendors ===
ALTER TABLE "vendors" ADD COLUMN IF NOT EXISTS "vendor_code" TEXT;
ALTER TABLE "vendors" ADD COLUMN IF NOT EXISTS "legal_name" TEXT;
ALTER TABLE "vendors" ADD COLUMN IF NOT EXISTS "trade_name" TEXT;
ALTER TABLE "vendors" ADD COLUMN IF NOT EXISTS "pan" TEXT;
ALTER TABLE "vendors" ADD COLUMN IF NOT EXISTS "state" TEXT;
ALTER TABLE "vendors" ADD COLUMN IF NOT EXISTS "state_code" TEXT;
ALTER TABLE "vendors" ADD COLUMN IF NOT EXISTS "pincode" TEXT;
ALTER TABLE "vendors" ADD COLUMN IF NOT EXISTS "contact_person_name" TEXT;
ALTER TABLE "vendors" ADD COLUMN IF NOT EXISTS "contact_person_phone" TEXT;
ALTER TABLE "vendors" ADD COLUMN IF NOT EXISTS "payment_terms_days" INTEGER DEFAULT 30;
ALTER TABLE "vendors" ADD COLUMN IF NOT EXISTS "bank_account_masked" TEXT;
ALTER TABLE "vendors" ADD COLUMN IF NOT EXISTS "ifsc_code" TEXT;
ALTER TABLE "vendors" ADD COLUMN IF NOT EXISTS "upi_id" TEXT;

-- === trip_billings ===
ALTER TABLE "trip_billings" ADD COLUMN IF NOT EXISTS "vehicle_id" TEXT;
ALTER TABLE "trip_billings" ADD COLUMN IF NOT EXISTS "driver_id" TEXT;
ALTER TABLE "trip_billings" ADD COLUMN IF NOT EXISTS "lr_number" TEXT;
ALTER TABLE "trip_billings" ADD COLUMN IF NOT EXISTS "challan_number" TEXT;
ALTER TABLE "trip_billings" ADD COLUMN IF NOT EXISTS "eway_bill_number" TEXT;
ALTER TABLE "trip_billings" ADD COLUMN IF NOT EXISTS "customer_po_number" TEXT;
ALTER TABLE "trip_billings" ADD COLUMN IF NOT EXISTS "place_of_supply_state" TEXT;
ALTER TABLE "trip_billings" ADD COLUMN IF NOT EXISTS "origin_state" TEXT;
ALTER TABLE "trip_billings" ADD COLUMN IF NOT EXISTS "destination_state" TEXT;
ALTER TABLE "trip_billings" ADD COLUMN IF NOT EXISTS "freight_amount" DECIMAL(12,2) DEFAULT 0;
ALTER TABLE "trip_billings" ADD COLUMN IF NOT EXISTS "loading_charges" DECIMAL(12,2) DEFAULT 0;
ALTER TABLE "trip_billings" ADD COLUMN IF NOT EXISTS "unloading_charges" DECIMAL(12,2) DEFAULT 0;
ALTER TABLE "trip_billings" ADD COLUMN IF NOT EXISTS "detention_charges" DECIMAL(12,2) DEFAULT 0;
ALTER TABLE "trip_billings" ADD COLUMN IF NOT EXISTS "toll_charges" DECIMAL(12,2) DEFAULT 0;
ALTER TABLE "trip_billings" ADD COLUMN IF NOT EXISTS "permit_charges" DECIMAL(12,2) DEFAULT 0;
ALTER TABLE "trip_billings" ADD COLUMN IF NOT EXISTS "other_charges" DECIMAL(12,2) DEFAULT 0;
ALTER TABLE "trip_billings" ADD COLUMN IF NOT EXISTS "taxable_amount" DECIMAL(12,2) DEFAULT 0;
ALTER TABLE "trip_billings" ADD COLUMN IF NOT EXISTS "cgst_amount" DECIMAL(12,2) DEFAULT 0;
ALTER TABLE "trip_billings" ADD COLUMN IF NOT EXISTS "sgst_amount" DECIMAL(12,2) DEFAULT 0;
ALTER TABLE "trip_billings" ADD COLUMN IF NOT EXISTS "igst_amount" DECIMAL(12,2) DEFAULT 0;
ALTER TABLE "trip_billings" ADD COLUMN IF NOT EXISTS "tds_amount" DECIMAL(12,2) DEFAULT 0;
ALTER TABLE "trip_billings" ADD COLUMN IF NOT EXISTS "net_receivable" DECIMAL(12,2) DEFAULT 0;
ALTER TABLE "trip_billings" ADD COLUMN IF NOT EXISTS "invoice_number" TEXT;
ALTER TABLE "trip_billings" ADD COLUMN IF NOT EXISTS "created_by_id" TEXT;
ALTER TABLE "trip_billings" ADD COLUMN IF NOT EXISTS "updated_by_id" TEXT;

-- === payment_records ===
ALTER TABLE "payment_records" ADD COLUMN IF NOT EXISTS "payment_number" TEXT;
ALTER TABLE "payment_records" ADD COLUMN IF NOT EXISTS "upi_reference" TEXT;
ALTER TABLE "payment_records" ADD COLUMN IF NOT EXISTS "bank_utr_number" TEXT;
ALTER TABLE "payment_records" ADD COLUMN IF NOT EXISTS "cheque_number" TEXT;
ALTER TABLE "payment_records" ADD COLUMN IF NOT EXISTS "cheque_date" TIMESTAMP(3);
ALTER TABLE "payment_records" ADD COLUMN IF NOT EXISTS "collected_by_driver_id" TEXT;
ALTER TABLE "payment_records" ADD COLUMN IF NOT EXISTS "reconciled_status" TEXT DEFAULT 'PENDING';
ALTER TABLE "payment_records" ADD COLUMN IF NOT EXISTS "reconciled_at" TIMESTAMP(3);
ALTER TABLE "payment_records" ADD COLUMN IF NOT EXISTS "received_by_id" TEXT;

-- === Indexes (idempotent) ===
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'customers_customer_code_key') THEN CREATE UNIQUE INDEX "customers_customer_code_key" ON "customers"("customer_code"); END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'vendors_vendor_code_key') THEN CREATE UNIQUE INDEX "vendors_vendor_code_key" ON "vendors"("vendor_code"); END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'trip_billings_invoice_number_key') THEN CREATE UNIQUE INDEX "trip_billings_invoice_number_key" ON "trip_billings"("invoice_number"); END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'trip_billings_vehicle_id_idx') THEN CREATE INDEX "trip_billings_vehicle_id_idx" ON "trip_billings"("vehicle_id"); END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'trip_billings_driver_id_idx') THEN CREATE INDEX "trip_billings_driver_id_idx" ON "trip_billings"("driver_id"); END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'payment_records_payment_number_key') THEN CREATE UNIQUE INDEX "payment_records_payment_number_key" ON "payment_records"("payment_number"); END IF; END $$;

-- === Foreign Keys (idempotent) ===
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'trip_billings_vehicle_id_fkey') THEN ALTER TABLE "trip_billings" ADD CONSTRAINT "trip_billings_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE SET NULL ON UPDATE CASCADE; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'trip_billings_driver_id_fkey') THEN ALTER TABLE "trip_billings" ADD CONSTRAINT "trip_billings_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers"("id") ON DELETE SET NULL ON UPDATE CASCADE; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'trip_billings_created_by_id_fkey') THEN ALTER TABLE "trip_billings" ADD CONSTRAINT "trip_billings_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'trip_billings_updated_by_id_fkey') THEN ALTER TABLE "trip_billings" ADD CONSTRAINT "trip_billings_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE; END IF; END $$;
