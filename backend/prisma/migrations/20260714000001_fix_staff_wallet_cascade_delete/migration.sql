-- Fix legacy staff-wallet foreign key constraints to cascade on delete.
--
-- Some existing deployments created these wallet tables outside the checked-in
-- Prisma schema. Fresh databases do not contain them, so this migration must be
-- safe in both cases:
--   1. legacy database: update the existing constraints;
--   2. fresh database: no-op without blocking all later migrations.

DO $$
BEGIN
  IF to_regclass('public.staff_wallet_transactions') IS NOT NULL
     AND to_regclass('public.staff_wallets') IS NOT NULL THEN
    ALTER TABLE "staff_wallet_transactions"
      DROP CONSTRAINT IF EXISTS "staff_wallet_transactions_wallet_id_fkey";

    ALTER TABLE "staff_wallet_transactions"
      ADD CONSTRAINT "staff_wallet_transactions_wallet_id_fkey"
      FOREIGN KEY ("wallet_id")
      REFERENCES "staff_wallets"("id")
      ON DELETE CASCADE;
  END IF;

  IF to_regclass('public.staff_wallets') IS NOT NULL
     AND to_regclass('public.users') IS NOT NULL THEN
    ALTER TABLE "staff_wallets"
      DROP CONSTRAINT IF EXISTS "staff_wallets_user_id_fkey";

    ALTER TABLE "staff_wallets"
      ADD CONSTRAINT "staff_wallets_user_id_fkey"
      FOREIGN KEY ("user_id")
      REFERENCES "users"("id")
      ON DELETE CASCADE;
  END IF;
END
$$;
