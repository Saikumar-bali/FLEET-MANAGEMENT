-- Phase 9: Driver Account Linking
-- Idempotent migration — safe for fresh CI and existing databases.

-- Add unique constraint on user_driver_id
-- Prevents multiple active users from being linked to the same driver
-- Partial index allows multiple NULL values
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'users_user_driver_id_key'
  ) THEN
    CREATE UNIQUE INDEX "users_user_driver_id_key" ON "users"("user_driver_id") WHERE "user_driver_id" IS NOT NULL;
  END IF;
END $$;
