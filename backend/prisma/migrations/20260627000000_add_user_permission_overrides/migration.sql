-- Add UserPermissionOverride model for individual dynamic permissions
-- Enables ALLOW/DENY overrides per user + permission
-- DENY wins over ALLOW. Expired overrides are ignored at query time.

CREATE TABLE IF NOT EXISTS "user_permission_overrides" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "permission_id" TEXT NOT NULL,
    "effect" TEXT NOT NULL DEFAULT 'ALLOW',
    "reason" TEXT,
    "expires_at" TIMESTAMPTZ,
    "granted_by_id" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_permission_overrides_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "user_permission_overrides_user_id_permission_id_key" UNIQUE ("user_id", "permission_id"),
    CONSTRAINT "user_permission_overrides_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
    CONSTRAINT "user_permission_overrides_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE,
    CONSTRAINT "user_permission_overrides_granted_by_id_fkey" FOREIGN KEY ("granted_by_id") REFERENCES "users"("id") ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS "user_permission_overrides_user_id_idx" ON "user_permission_overrides"("user_id");
CREATE INDEX IF NOT EXISTS "user_permission_overrides_permission_id_idx" ON "user_permission_overrides"("permission_id");
CREATE INDEX IF NOT EXISTS "user_permission_overrides_effect_idx" ON "user_permission_overrides"("effect");
CREATE INDEX IF NOT EXISTS "user_permission_overrides_expires_at_idx" ON "user_permission_overrides"("expires_at");

-- Add CHECK constraint for effect enum
ALTER TABLE "user_permission_overrides" ADD CONSTRAINT "user_permission_overrides_effect_check" CHECK ("effect" IN ('ALLOW', 'DENY'));
