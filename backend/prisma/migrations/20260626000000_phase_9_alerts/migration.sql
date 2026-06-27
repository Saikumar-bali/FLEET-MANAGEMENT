-- Phase 9: Alerts, Notifications & Reports
-- Idempotent migration — safe for fresh CI and existing databases.

-- CreateEnum: AlertSeverity
DO $$ BEGIN
  CREATE TYPE "AlertSeverity" AS ENUM ('INFO', 'WARNING', 'CRITICAL');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- CreateEnum: AlertStatus
DO $$ BEGIN
  CREATE TYPE "AlertStatus" AS ENUM ('UNREAD', 'READ', 'RESOLVED', 'DISMISSED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- CreateEnum: AlertModule
DO $$ BEGIN
  CREATE TYPE "AlertModule" AS ENUM ('VEHICLE', 'DRIVER', 'TRIP', 'FUEL', 'DOCUMENTS', 'COMPLIANCE', 'FINANCE', 'MAINTENANCE', 'REPAIR', 'SYSTEM');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- CreateEnum: AlertTriggerType
DO $$ BEGIN
  CREATE TYPE "AlertTriggerType" AS ENUM ('EXPIRY', 'OVERDUE', 'THRESHOLD', 'MISSING_DOCUMENT', 'STATUS_CHANGE', 'MANUAL');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- AlterTable: users (link to Driver for driver-role scoping)
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "user_driver_id" TEXT;

-- CreateTable: alert_rules
CREATE TABLE IF NOT EXISTS "alert_rules" (
  "id" TEXT PRIMARY KEY,
  "key" TEXT NOT NULL UNIQUE,
  "module" "AlertModule" NOT NULL,
  "trigger_type" "AlertTriggerType" NOT NULL,
  "severity" "AlertSeverity" NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "threshold_days" INTEGER,
  "threshold_value" DECIMAL(14,2),
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);

-- CreateTable: alerts
CREATE TABLE IF NOT EXISTS "alerts" (
  "id" TEXT PRIMARY KEY,
  "rule_id" TEXT,
  "dedupe_key" TEXT NOT NULL UNIQUE,
  "module" "AlertModule" NOT NULL,
  "trigger_type" "AlertTriggerType" NOT NULL,
  "severity" "AlertSeverity" NOT NULL,
  "status" "AlertStatus" NOT NULL DEFAULT 'UNREAD',
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "entity_type" TEXT,
  "entity_id" TEXT,
  "vehicle_id" TEXT,
  "driver_id" TEXT,
  "trip_id" TEXT,
  "metadata" JSONB,
  "detected_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "read_at" TIMESTAMP(3),
  "resolved_at" TIMESTAMP(3),
  "resolved_by_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);

-- CreateIndex: alerts
CREATE INDEX IF NOT EXISTS "alerts_status_idx" ON "alerts"("status");
CREATE INDEX IF NOT EXISTS "alerts_module_idx" ON "alerts"("module");
CREATE INDEX IF NOT EXISTS "alerts_severity_idx" ON "alerts"("severity");
CREATE INDEX IF NOT EXISTS "alerts_vehicle_id_idx" ON "alerts"("vehicle_id");
CREATE INDEX IF NOT EXISTS "alerts_driver_id_idx" ON "alerts"("driver_id");
CREATE INDEX IF NOT EXISTS "alerts_trip_id_idx" ON "alerts"("trip_id");
CREATE INDEX IF NOT EXISTS "alerts_detected_at_idx" ON "alerts"("detected_at");
CREATE INDEX IF NOT EXISTS "alerts_dedupe_key_idx" ON "alerts"("dedupe_key");

-- AddForeignKey: alerts.rule_id -> alert_rules.id
DO $$ BEGIN
  ALTER TABLE "alerts" ADD CONSTRAINT "alerts_rule_id_fkey"
    FOREIGN KEY ("rule_id") REFERENCES "alert_rules"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- AddForeignKey: alerts.resolved_by_id -> users.id
DO $$ BEGIN
  ALTER TABLE "alerts" ADD CONSTRAINT "alerts_resolved_by_id_fkey"
    FOREIGN KEY ("resolved_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- AddForeignKey: users.user_driver_id -> drivers.id
DO $$ BEGIN
  ALTER TABLE "users" ADD CONSTRAINT "users_user_driver_id_fkey"
    FOREIGN KEY ("user_driver_id") REFERENCES "drivers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;