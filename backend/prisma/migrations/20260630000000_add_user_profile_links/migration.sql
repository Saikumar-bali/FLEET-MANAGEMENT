-- CreateEnum
CREATE TYPE "ProfileType" AS ENUM ('DRIVER', 'MECHANIC', 'EMPLOYEE', 'FINANCE', 'COLLECTOR', 'VENDOR_CONTACT', 'CUSTOMER_CONTACT');

-- CreateEnum
CREATE TYPE "UserProfileLinkStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'REVOKED');

-- CreateTable
CREATE TABLE "user_profile_links" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "profile_type" "ProfileType" NOT NULL,
    "profile_id" TEXT NOT NULL,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "status" "UserProfileLinkStatus" NOT NULL DEFAULT 'ACTIVE',
    "linked_by_id" TEXT,
    "linked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unlinked_at" TIMESTAMP(3),
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_profile_links_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_profile_links_user_id_profile_type_profile_id_status_key" ON "user_profile_links"("user_id", "profile_type", "profile_id", "status");

-- CreateIndex
CREATE INDEX "user_profile_links_user_id_profile_type_idx" ON "user_profile_links"("user_id", "profile_type");

-- CreateIndex
CREATE INDEX "user_profile_links_profile_type_profile_id_idx" ON "user_profile_links"("profile_type", "profile_id");

-- AddForeignKey
ALTER TABLE "user_profile_links" ADD CONSTRAINT "user_profile_links_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_profile_links" ADD CONSTRAINT "user_profile_links_linked_by_id_fkey" FOREIGN KEY ("linked_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
