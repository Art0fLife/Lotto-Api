-- Migration: create_bets_table

CREATE TABLE "bets" (
  "id" SERIAL PRIMARY KEY,
  "admin_id" INTEGER NOT NULL,
  "bill_id" INTEGER NOT NULL,
  "lotto_category_id" INTEGER NOT NULL,
  "row_number" INTEGER NOT NULL,
  "code" VARCHAR(255) NOT NULL,
  "amount" NUMERIC(12,2) NOT NULL,
  "is_limit_number" INTEGER NOT NULL DEFAULT 0,
  "winner_amount" NUMERIC(12,2) NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "deleted_at" TIMESTAMP WITH TIME ZONE
);

-- Indexes
CREATE INDEX "bets_admin_id_idx" ON "bets" ("admin_id");
CREATE INDEX "bets_bill_id_idx" ON "bets" ("bill_id");
CREATE INDEX "bets_lotto_category_id_idx" ON "bets" ("lotto_category_id");
CREATE INDEX "bets_row_number_idx" ON "bets" ("row_number");
CREATE INDEX "bets_code_idx" ON "bets" ("code");
CREATE INDEX "bets_is_limit_number_idx" ON "bets" ("is_limit_number");