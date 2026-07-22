-- Canonical finance custody, allocation, settlement and double-entry ledger.
-- This migration is additive and upgrades deployments that may have legacy
-- staff-wallet tables created outside the checked-in Prisma history.

DO $$ BEGIN CREATE TYPE "ExpensePaymentSource" AS ENUM ('STAFF_WALLET','COMPANY_ACCOUNT','CORPORATE_CARD','VENDOR_CREDIT','PERSONAL_MONEY'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "WalletEntryDirection" AS ENUM ('CREDIT','DEBIT'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "WalletEntryType" AS ENUM ('DISBURSEMENT','EXPENSE','CASH_RETURN','CARRY_FORWARD','REIMBURSEMENT','REVERSAL','ADJUSTMENT'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "WalletAllocationStatus" AS ENUM ('ACTIVE','RECONCILING','CLOSED','CANCELLED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "StaffAdvanceContextType" AS ENUM ('TRIP','REPAIR','MAINTENANCE','PURCHASE','OTHER'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "StaffAdvanceStatus" AS ENUM ('DRAFT','SUBMITTED','APPROVED','FUNDED','ACTIVE','RECONCILING','CLOSED','NEEDS_CHANGES','REJECTED','CANCELLED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "AdvanceFundingMode" AS ENUM ('USE_EXISTING_BALANCE','PRESERVE_EXISTING_BALANCE'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "StaffSettlementStatus" AS ENUM ('DRAFT','SUBMITTED','UNDER_REVIEW','APPROVED','CASH_CONFIRMED','CLOSED','NEEDS_CHANGES','REJECTED','CANCELLED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "SettlementDisposition" AS ENUM ('RETURN','CARRY_FORWARD'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "JournalEntryStatus" AS ENUM ('POSTED','REVERSED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "JournalLineSide" AS ENUM ('DEBIT','CREDIT'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "FinancePaymentDirection" AS ENUM ('INCOMING','OUTGOING'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE "fuel_entries"
  ADD COLUMN IF NOT EXISTS "payment_source" "ExpensePaymentSource" NOT NULL DEFAULT 'COMPANY_ACCOUNT',
  ADD COLUMN IF NOT EXISTS "finance_account_id" TEXT,
  ADD COLUMN IF NOT EXISTS "paid_by_user_id" TEXT,
  ADD COLUMN IF NOT EXISTS "financial_posted_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "journal_entry_id" TEXT;

ALTER TABLE "expenses"
  ADD COLUMN IF NOT EXISTS "payment_source" "ExpensePaymentSource" NOT NULL DEFAULT 'COMPANY_ACCOUNT',
  ADD COLUMN IF NOT EXISTS "finance_account_id" TEXT,
  ADD COLUMN IF NOT EXISTS "paid_by_user_id" TEXT,
  ADD COLUMN IF NOT EXISTS "financial_posted_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "journal_entry_id" TEXT;

ALTER TABLE "payment_records"
  ADD COLUMN IF NOT EXISTS "direction" "FinancePaymentDirection" NOT NULL DEFAULT 'INCOMING',
  ADD COLUMN IF NOT EXISTS "reconciled_by_id" TEXT,
  ADD COLUMN IF NOT EXISTS "reversed_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "reversal_of_id" TEXT,
  ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "finance_transactions"
  ADD COLUMN IF NOT EXISTS "financial_posted_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "journal_entry_id" TEXT;

CREATE TABLE IF NOT EXISTS "staff_wallets" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL UNIQUE,
  "currency" TEXT NOT NULL DEFAULT 'INR',
  "current_balance" NUMERIC(14,2) NOT NULL DEFAULT 0,
  "reserved_balance" NUMERIC(14,2) NOT NULL DEFAULT 0,
  "version" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Upgrade a legacy wallet table in place when it already existed.
ALTER TABLE "staff_wallets"
  ADD COLUMN IF NOT EXISTS "currency" TEXT NOT NULL DEFAULT 'INR',
  ADD COLUMN IF NOT EXISTS "current_balance" NUMERIC(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "reserved_balance" NUMERIC(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "version" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='staff_wallets' AND column_name='balance') THEN
    EXECUTE 'UPDATE "staff_wallets" SET "current_balance" = COALESCE("balance", 0) WHERE "current_balance" = 0';
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "staff_advances" (
  "id" TEXT PRIMARY KEY,
  "advance_number" TEXT NOT NULL UNIQUE,
  "beneficiary_user_id" TEXT NOT NULL,
  "context_type" "StaffAdvanceContextType" NOT NULL,
  "context_id" TEXT NOT NULL,
  "trip_id" TEXT,
  "vehicle_id" TEXT,
  "account_id" TEXT,
  "target_allowance" NUMERIC(14,2) NOT NULL,
  "existing_balance_allocated" NUMERIC(14,2) NOT NULL DEFAULT 0,
  "new_cash_issued" NUMERIC(14,2) NOT NULL DEFAULT 0,
  "total_allocated" NUMERIC(14,2) NOT NULL DEFAULT 0,
  "spent_amount" NUMERIC(14,2) NOT NULL DEFAULT 0,
  "returned_amount" NUMERIC(14,2) NOT NULL DEFAULT 0,
  "carried_forward_amount" NUMERIC(14,2) NOT NULL DEFAULT 0,
  "reimbursement_amount" NUMERIC(14,2) NOT NULL DEFAULT 0,
  "funding_mode" "AdvanceFundingMode" NOT NULL DEFAULT 'USE_EXISTING_BALANCE',
  "payment_mode" "PaymentMode" NOT NULL DEFAULT 'CASH',
  "status" "StaffAdvanceStatus" NOT NULL DEFAULT 'DRAFT',
  "purpose" TEXT,
  "notes" TEXT,
  "due_date" TIMESTAMP(3),
  "submitted_at" TIMESTAMP(3),
  "approved_at" TIMESTAMP(3),
  "funded_at" TIMESTAMP(3),
  "closed_at" TIMESTAMP(3),
  "created_by_id" TEXT,
  "approved_by_id" TEXT,
  "funded_by_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "wallet_allocations" (
  "id" TEXT PRIMARY KEY,
  "wallet_id" TEXT NOT NULL,
  "advance_id" TEXT NOT NULL UNIQUE,
  "trip_id" TEXT,
  "allocated_amount" NUMERIC(14,2) NOT NULL,
  "consumed_amount" NUMERIC(14,2) NOT NULL DEFAULT 0,
  "released_amount" NUMERIC(14,2) NOT NULL DEFAULT 0,
  "status" "WalletAllocationStatus" NOT NULL DEFAULT 'ACTIVE',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "staff_wallet_entries" (
  "id" TEXT PRIMARY KEY,
  "wallet_id" TEXT NOT NULL,
  "allocation_id" TEXT,
  "advance_id" TEXT,
  "direction" "WalletEntryDirection" NOT NULL,
  "entry_type" "WalletEntryType" NOT NULL,
  "amount" NUMERIC(14,2) NOT NULL,
  "balance_before" NUMERIC(14,2) NOT NULL,
  "balance_after" NUMERIC(14,2) NOT NULL,
  "reserved_before" NUMERIC(14,2) NOT NULL,
  "reserved_after" NUMERIC(14,2) NOT NULL,
  "source_type" TEXT NOT NULL,
  "source_id" TEXT NOT NULL,
  "idempotency_key" TEXT NOT NULL UNIQUE,
  "description" TEXT,
  "created_by_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "staff_settlements" (
  "id" TEXT PRIMARY KEY,
  "settlement_number" TEXT NOT NULL UNIQUE,
  "advance_id" TEXT NOT NULL,
  "disposition" "SettlementDisposition" NOT NULL,
  "approved_spend" NUMERIC(14,2) NOT NULL DEFAULT 0,
  "declared_return_amount" NUMERIC(14,2) NOT NULL DEFAULT 0,
  "confirmed_return_amount" NUMERIC(14,2) NOT NULL DEFAULT 0,
  "carry_forward_amount" NUMERIC(14,2) NOT NULL DEFAULT 0,
  "reimbursement_amount" NUMERIC(14,2) NOT NULL DEFAULT 0,
  "variance_amount" NUMERIC(14,2) NOT NULL DEFAULT 0,
  "status" "StaffSettlementStatus" NOT NULL DEFAULT 'DRAFT',
  "notes" TEXT,
  "payment_mode" "PaymentMode",
  "reference_number" TEXT,
  "cash_receipt_number" TEXT UNIQUE,
  "proof_document_id" TEXT,
  "created_by_id" TEXT,
  "approved_by_id" TEXT,
  "cashier_id" TEXT,
  "submitted_at" TIMESTAMP(3),
  "approved_at" TIMESTAMP(3),
  "cash_confirmed_at" TIMESTAMP(3),
  "closed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "staff_settlement_lines" (
  "id" TEXT PRIMARY KEY,
  "settlement_id" TEXT NOT NULL,
  "line_type" TEXT NOT NULL,
  "source_id" TEXT,
  "payment_source" "ExpensePaymentSource",
  "amount" NUMERIC(14,2) NOT NULL,
  "description" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "journal_entries" (
  "id" TEXT PRIMARY KEY,
  "entry_number" TEXT NOT NULL UNIQUE,
  "idempotency_key" TEXT NOT NULL UNIQUE,
  "source_type" TEXT NOT NULL,
  "source_id" TEXT NOT NULL,
  "posting_date" TIMESTAMP(3) NOT NULL,
  "description" TEXT,
  "status" "JournalEntryStatus" NOT NULL DEFAULT 'POSTED',
  "reversed_by_id" TEXT,
  "created_by_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "journal_lines" (
  "id" TEXT PRIMARY KEY,
  "journal_entry_id" TEXT NOT NULL,
  "side" "JournalLineSide" NOT NULL,
  "account_code" TEXT NOT NULL,
  "finance_account_id" TEXT,
  "amount" NUMERIC(14,2) NOT NULL,
  "trip_id" TEXT,
  "vehicle_id" TEXT,
  "beneficiary_user_id" TEXT,
  "description" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "payment_allocations" (
  "id" TEXT PRIMARY KEY,
  "payment_id" TEXT NOT NULL,
  "trip_billing_id" TEXT NOT NULL,
  "amount" NUMERIC(14,2) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "payment_allocations_payment_billing_key" UNIQUE ("payment_id","trip_billing_id")
);

CREATE TABLE IF NOT EXISTS "trip_allowance_policies" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "trip_type" "TripType",
  "base_amount" NUMERIC(14,2) NOT NULL DEFAULT 0,
  "per_km_amount" NUMERIC(14,2) NOT NULL DEFAULT 0,
  "max_amount" NUMERIC(14,2),
  "auto_approve_threshold" NUMERIC(14,2),
  "funding_mode" "AdvanceFundingMode" NOT NULL DEFAULT 'USE_EXISTING_BALANCE',
  "account_id" TEXT,
  "payment_mode" "PaymentMode" NOT NULL DEFAULT 'CASH',
  "auto_fund" BOOLEAN NOT NULL DEFAULT false,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

DO $$ BEGIN ALTER TABLE "staff_wallets" ADD CONSTRAINT "staff_wallets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "staff_advances" ADD CONSTRAINT "staff_advances_beneficiary_user_id_fkey" FOREIGN KEY ("beneficiary_user_id") REFERENCES "users"("id") ON DELETE RESTRICT; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "staff_advances" ADD CONSTRAINT "staff_advances_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE SET NULL; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "staff_advances" ADD CONSTRAINT "staff_advances_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE SET NULL; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "staff_advances" ADD CONSTRAINT "staff_advances_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "finance_accounts"("id") ON DELETE SET NULL; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "wallet_allocations" ADD CONSTRAINT "wallet_allocations_wallet_id_fkey" FOREIGN KEY ("wallet_id") REFERENCES "staff_wallets"("id") ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "wallet_allocations" ADD CONSTRAINT "wallet_allocations_advance_id_fkey" FOREIGN KEY ("advance_id") REFERENCES "staff_advances"("id") ON DELETE RESTRICT; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "staff_wallet_entries" ADD CONSTRAINT "staff_wallet_entries_wallet_id_fkey" FOREIGN KEY ("wallet_id") REFERENCES "staff_wallets"("id") ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "staff_wallet_entries" ADD CONSTRAINT "staff_wallet_entries_allocation_id_fkey" FOREIGN KEY ("allocation_id") REFERENCES "wallet_allocations"("id") ON DELETE SET NULL; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "staff_wallet_entries" ADD CONSTRAINT "staff_wallet_entries_advance_id_fkey" FOREIGN KEY ("advance_id") REFERENCES "staff_advances"("id") ON DELETE SET NULL; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "staff_settlements" ADD CONSTRAINT "staff_settlements_advance_id_fkey" FOREIGN KEY ("advance_id") REFERENCES "staff_advances"("id") ON DELETE RESTRICT; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "staff_settlement_lines" ADD CONSTRAINT "staff_settlement_lines_settlement_id_fkey" FOREIGN KEY ("settlement_id") REFERENCES "staff_settlements"("id") ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "journal_lines" ADD CONSTRAINT "journal_lines_journal_entry_id_fkey" FOREIGN KEY ("journal_entry_id") REFERENCES "journal_entries"("id") ON DELETE RESTRICT; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "payment_allocations" ADD CONSTRAINT "payment_allocations_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payment_records"("id") ON DELETE RESTRICT; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "payment_allocations" ADD CONSTRAINT "payment_allocations_trip_billing_id_fkey" FOREIGN KEY ("trip_billing_id") REFERENCES "trip_billings"("id") ON DELETE RESTRICT; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "trip_allowance_policies" ADD CONSTRAINT "trip_allowance_policies_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "finance_accounts"("id") ON DELETE SET NULL; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "staff_settlements" ADD CONSTRAINT "staff_settlements_proof_document_id_fkey" FOREIGN KEY ("proof_document_id") REFERENCES "documents"("id") ON DELETE SET NULL; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "fuel_entries" ADD CONSTRAINT "fuel_entries_finance_account_id_fkey" FOREIGN KEY ("finance_account_id") REFERENCES "finance_accounts"("id") ON DELETE SET NULL; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "fuel_entries" ADD CONSTRAINT "fuel_entries_paid_by_user_id_fkey" FOREIGN KEY ("paid_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "fuel_entries" ADD CONSTRAINT "fuel_entries_journal_entry_id_fkey" FOREIGN KEY ("journal_entry_id") REFERENCES "journal_entries"("id") ON DELETE SET NULL; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "expenses" ADD CONSTRAINT "expenses_finance_account_id_fkey" FOREIGN KEY ("finance_account_id") REFERENCES "finance_accounts"("id") ON DELETE SET NULL; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "expenses" ADD CONSTRAINT "expenses_paid_by_user_id_fkey" FOREIGN KEY ("paid_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "expenses" ADD CONSTRAINT "expenses_journal_entry_id_fkey" FOREIGN KEY ("journal_entry_id") REFERENCES "journal_entries"("id") ON DELETE SET NULL; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "finance_transactions" ADD CONSTRAINT "finance_transactions_journal_entry_id_fkey" FOREIGN KEY ("journal_entry_id") REFERENCES "journal_entries"("id") ON DELETE SET NULL; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "payment_records" ADD CONSTRAINT "payment_records_reconciled_by_id_fkey" FOREIGN KEY ("reconciled_by_id") REFERENCES "users"("id") ON DELETE SET NULL; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "payment_records" ADD CONSTRAINT "payment_records_reversal_of_id_fkey" FOREIGN KEY ("reversal_of_id") REFERENCES "payment_records"("id") ON DELETE SET NULL; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "staff_advances_beneficiary_context_key" ON "staff_advances"("beneficiary_user_id","context_type","context_id");
CREATE INDEX IF NOT EXISTS "staff_advances_user_status_idx" ON "staff_advances"("beneficiary_user_id","status");
CREATE INDEX IF NOT EXISTS "staff_advances_trip_idx" ON "staff_advances"("trip_id");
CREATE INDEX IF NOT EXISTS "wallet_allocations_wallet_status_idx" ON "wallet_allocations"("wallet_id","status");
CREATE INDEX IF NOT EXISTS "wallet_allocations_trip_status_idx" ON "wallet_allocations"("trip_id","status");
CREATE INDEX IF NOT EXISTS "staff_wallet_entries_wallet_created_idx" ON "staff_wallet_entries"("wallet_id","created_at" DESC);
CREATE INDEX IF NOT EXISTS "staff_wallet_entries_source_idx" ON "staff_wallet_entries"("source_type","source_id");
CREATE INDEX IF NOT EXISTS "staff_settlements_advance_status_idx" ON "staff_settlements"("advance_id","status");
CREATE INDEX IF NOT EXISTS "staff_settlement_lines_settlement_idx" ON "staff_settlement_lines"("settlement_id");
CREATE INDEX IF NOT EXISTS "staff_settlement_lines_source_idx" ON "staff_settlement_lines"("line_type","source_id");
CREATE INDEX IF NOT EXISTS "journal_entries_source_idx" ON "journal_entries"("source_type","source_id");
CREATE INDEX IF NOT EXISTS "journal_entries_posting_idx" ON "journal_entries"("posting_date","status");
CREATE INDEX IF NOT EXISTS "journal_lines_entry_idx" ON "journal_lines"("journal_entry_id");
CREATE INDEX IF NOT EXISTS "journal_lines_account_idx" ON "journal_lines"("account_code");
CREATE INDEX IF NOT EXISTS "journal_lines_trip_idx" ON "journal_lines"("trip_id");
CREATE INDEX IF NOT EXISTS "payment_allocations_billing_idx" ON "payment_allocations"("trip_billing_id");
CREATE INDEX IF NOT EXISTS "trip_allowance_policies_type_active_idx" ON "trip_allowance_policies"("trip_type","is_active");

INSERT INTO "permissions" ("id","key","module","action","description","created_at","updated_at") VALUES
  ('perm_staff_wallet_view','staff_wallet_view','finance','view','View staff wallets and custody ledger',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
  ('perm_staff_advance_manage','staff_advance_manage','finance','manage','Create and submit staff advances',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
  ('perm_staff_advance_approve','staff_advance_approve','finance','approve','Approve staff advances',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
  ('perm_staff_advance_fund','staff_advance_fund','finance','fund','Disburse approved staff advances',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
  ('perm_staff_settlement_manage','staff_settlement_manage','finance','manage','Create and submit staff settlements',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
  ('perm_staff_settlement_approve','staff_settlement_approve','finance','approve','Approve staff settlements',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
  ('perm_staff_settlement_cashier','staff_settlement_cashier','finance','cashier','Confirm returned cash and close settlements',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
  ('perm_finance_reconcile','finance_reconcile','finance','reconcile','Reconcile incoming and outgoing payments',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
  ('perm_allowance_policy_manage','allowance_policy_manage','finance','manage','Manage trip allowance policies',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
  ('perm_staff_wallet_view_own','staff_wallet_view_own','staff_portal','view_own','View own wallet, advances and settlements',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO NOTHING;

INSERT INTO "role_permissions" ("id","role_id","permission_id","created_at")
SELECT 'rp_fin_e2e_' || md5(r.id || p.id), r.id, p.id, CURRENT_TIMESTAMP
FROM "roles" r CROSS JOIN "permissions" p
WHERE r.key IN ('super_admin','admin','finance')
  AND p.key IN ('staff_wallet_view','staff_advance_manage','staff_advance_approve','staff_advance_fund','staff_settlement_manage','staff_settlement_approve','staff_settlement_cashier','finance_reconcile','allowance_policy_manage')
ON CONFLICT ("role_id","permission_id") DO NOTHING;

INSERT INTO "role_permissions" ("id","role_id","permission_id","created_at")
SELECT 'rp_fin_own_' || md5(r.id || p.id), r.id, p.id, CURRENT_TIMESTAMP
FROM "roles" r CROSS JOIN "permissions" p
WHERE r.key IN ('driver','assistant_driver','mechanic','collector','finance')
  AND p.key = 'staff_wallet_view_own'
ON CONFLICT ("role_id","permission_id") DO NOTHING;
