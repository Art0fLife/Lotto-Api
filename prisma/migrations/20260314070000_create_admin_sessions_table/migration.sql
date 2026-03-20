CREATE TABLE "admin_sessions" (
    "id" VARCHAR(191) NOT NULL,
    "admin_id" INTEGER NOT NULL,
    "device_id" VARCHAR(191) NOT NULL,
    "refresh_token_hash" VARCHAR(255),
    "session_expires_at" TIMESTAMPTZ(6) NOT NULL,
    "revoked_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_sessions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "admin_sessions_admin_id_idx" ON "admin_sessions"("admin_id");
CREATE INDEX "admin_sessions_admin_id_device_id_revoked_at_idx" ON "admin_sessions"("admin_id", "device_id", "revoked_at");