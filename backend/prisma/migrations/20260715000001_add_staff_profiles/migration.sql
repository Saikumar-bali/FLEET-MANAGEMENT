-- CreateEnum
CREATE TYPE "StaffProfileStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED');

-- AlterEnum
ALTER TYPE "LinkedEntityType" ADD VALUE 'STAFF_PROFILE';

-- CreateTable
CREATE TABLE "staff_profiles" (
    "id" TEXT NOT NULL,
    "profile_type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "status" "StaffProfileStatus" NOT NULL DEFAULT 'ACTIVE',
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "staff_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "staff_profiles_profile_type_status_idx" ON "staff_profiles"("profile_type", "status");

-- AlterTable
ALTER TABLE "documents" ADD COLUMN "staff_profile_id" TEXT;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_staff_profile_id_fkey" FOREIGN KEY ("staff_profile_id") REFERENCES "staff_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
