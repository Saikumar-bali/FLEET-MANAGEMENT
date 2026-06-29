-- CreateEnum
CREATE TYPE "PermissionOverrideEffect" AS ENUM ('ALLOW', 'DENY');
-- CreateEnum
CREATE TYPE "DataScopeType" AS ENUM ('OWN', 'USER', 'DRIVER', 'VEHICLE', 'TRIP', 'ASSET', 'CUSTOMER', 'VENDOR', 'BRANCH', 'DEPARTMENT', 'FINANCE', 'GLOBAL');
-- CreateEnum
CREATE TYPE "DataScopeAccessLevel" AS ENUM ('VIEW', 'CREATE', 'UPDATE', 'DELETE', 'MANAGE');
-- CreateTable
CREATE TABLE "user_permission_overrides" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "permission_id" TEXT NOT NULL,
    "effect" "PermissionOverrideEffect" NOT NULL,
    "reason" TEXT,
    "expires_at" TIMESTAMPTZ,
    "granted_by_id" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    CONSTRAINT "user_permission_overrides_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE "user_data_scopes" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "scope_type" "DataScopeType" NOT NULL,
    "scope_id" TEXT,
    "access_level" "DataScopeAccessLevel" NOT NULL,
    "reason" TEXT,
    "expires_at" TIMESTAMPTZ,
    "granted_by_id" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    CONSTRAINT "user_data_scopes_pkey" PRIMARY KEY ("id")
);
-- CreateIndex
CREATE UNIQUE INDEX "user_permission_overrides_user_id_permission_id_key" ON "user_permission_overrides"("user_id", "permission_id");
-- CreateIndex
CREATE INDEX "user_data_scopes_user_id_scope_type_scope_id_idx" ON "user_data_scopes"("user_id", "scope_type", "scope_id");
-- AddForeignKey
ALTER TABLE "user_permission_overrides" ADD CONSTRAINT "user_permission_overrides_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "user_permission_overrides" ADD CONSTRAINT "user_permission_overrides_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "user_permission_overrides" ADD CONSTRAINT "user_permission_overrides_granted_by_id_fkey" FOREIGN KEY ("granted_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "user_data_scopes" ADD CONSTRAINT "user_data_scopes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "user_data_scopes" ADD CONSTRAINT "user_data_scopes_granted_by_id_fkey" FOREIGN KEY ("granted_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
