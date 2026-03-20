-- Migration: create_bills_table

CREATE TABLE "bills" (
  "id" SERIAL PRIMARY KEY,
  "admin_id" smallint NOT NULL,
  "ticket_id" smallint NOT NULL,
  "total_amount" NUMERIC(12,2) NOT NULL DEFAULT 0,
  "total_winner" NUMERIC(12,2) NOT NULL DEFAULT 0,
  "created_at" timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  "deleted_at" timestamp NULL DEFAULT NULL
);

-- Indexes
CREATE INDEX "bills_admin_id_idx" ON "bills" ("admin_id");
CREATE INDEX "bills_ticket_id_idx" ON "bills" ("ticket_id");


