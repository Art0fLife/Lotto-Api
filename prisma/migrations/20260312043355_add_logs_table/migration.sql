
-- CreateTable
CREATE TABLE "logs" (
    "id" BIGSERIAL NOT NULL,
    "bill_id" BIGINT NOT NULL,
    "admin_id" SMALLINT NOT NULL,
    "row_number" INTEGER NOT NULL,
    "lotto_category_id" INTEGER NOT NULL,
    "code" VARCHAR(3) NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "logs_pkey" PRIMARY KEY ("id")
);
