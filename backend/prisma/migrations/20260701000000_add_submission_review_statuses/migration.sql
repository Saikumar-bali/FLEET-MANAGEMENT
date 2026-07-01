-- Phase 19: Driver Submission Review & Approval Workflow
-- Safe enum additions + review fields. No destructive changes.

-- 1. Add NEEDS_CHANGES to WorkflowRecordStatus enum
ALTER TYPE "WorkflowRecordStatus" ADD VALUE IF NOT EXISTS 'NEEDS_CHANGES';

-- 2. Add NEEDS_CHANGES to DocumentVerificationStatus enum
ALTER TYPE "DocumentVerificationStatus" ADD VALUE IF NOT EXISTS 'NEEDS_CHANGES';

-- 3. Add REJECTED to VehicleIssueStatus enum
ALTER TYPE "VehicleIssueStatus" ADD VALUE IF NOT EXISTS 'REJECTED';

-- 4. Create VehicleInspectionReviewStatus enum
DO $$ BEGIN
  CREATE TYPE "VehicleInspectionReviewStatus" AS ENUM ('SUBMITTED', 'REVIEWED', 'REJECTED', 'NEEDS_CHANGES');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 5. Add review_comments to FuelEntry
ALTER TABLE "fuel_entries" ADD COLUMN "review_comments" TEXT;

-- 6. Add review_comments to Expense
ALTER TABLE "expenses" ADD COLUMN "review_comments" TEXT;

-- 7. Add review_comments to Document
ALTER TABLE "documents" ADD COLUMN "review_comments" TEXT;

-- 8. Add review fields to VehicleIssue
ALTER TABLE "vehicle_issues" ADD COLUMN "review_comments" TEXT;
ALTER TABLE "vehicle_issues" ADD COLUMN "reviewed_by_id" TEXT;
ALTER TABLE "vehicle_issues" ADD COLUMN "reviewed_at" TIMESTAMPTZ;
ALTER TABLE "vehicle_issues" ADD CONSTRAINT "VehicleIssueReviewedBy_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 9. Add review fields to VehicleInspection
ALTER TABLE "vehicle_inspections" ADD COLUMN "review_status" "VehicleInspectionReviewStatus" NOT NULL DEFAULT 'SUBMITTED';
ALTER TABLE "vehicle_inspections" ADD COLUMN "review_comments" TEXT;
ALTER TABLE "vehicle_inspections" ADD COLUMN "reviewed_by_id" TEXT;
ALTER TABLE "vehicle_inspections" ADD COLUMN "reviewed_at" TIMESTAMPTZ;
ALTER TABLE "vehicle_inspections" ADD CONSTRAINT "VehicleInspectionReviewedBy_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 10. Add indexes for review status queries
CREATE INDEX IF NOT EXISTS "vehicle_issues_reviewed_by_id_idx" ON "vehicle_issues"("reviewed_by_id");
CREATE INDEX IF NOT EXISTS "vehicle_inspections_review_status_idx" ON "vehicle_inspections"("review_status");
CREATE INDEX IF NOT EXISTS "vehicle_inspections_reviewed_by_id_idx" ON "vehicle_inspections"("reviewed_by_id");
