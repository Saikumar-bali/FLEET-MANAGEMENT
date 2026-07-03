-- Phase 19 hardening: mechanic assignment for Repair & MaintenanceRequest
-- Additive only, nullable columns, no destructive changes. Safe to deploy
-- without downtime and safe to roll back (drop column) if needed.

-- 1. Add assigned_to_id to repairs
ALTER TABLE "repairs" ADD COLUMN "assigned_to_id" TEXT;
ALTER TABLE "repairs" ADD CONSTRAINT "RepairAssignedTo_fkey" FOREIGN KEY ("assigned_to_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX IF NOT EXISTS "repairs_assigned_to_id_idx" ON "repairs"("assigned_to_id");

-- 2. Add assigned_to_id to maintenance_requests
ALTER TABLE "maintenance_requests" ADD COLUMN "assigned_to_id" TEXT;
ALTER TABLE "maintenance_requests" ADD CONSTRAINT "MaintenanceAssignedTo_fkey" FOREIGN KEY ("assigned_to_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX IF NOT EXISTS "maintenance_requests_assigned_to_id_idx" ON "maintenance_requests"("assigned_to_id");
