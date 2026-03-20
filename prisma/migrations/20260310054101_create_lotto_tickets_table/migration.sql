-- CreateTable
CREATE TABLE "lotto_tickets" (
  "id" SERIAL NOT NULL,
  "title" varchar(255) NOT NULL,
  "status" smallint NOT NULL DEFAULT 0,
  "start_date" timestamp NULL DEFAULT NULL,
  "end_date" timestamp NULL DEFAULT NULL,
  "reward_number" varchar(255) DEFAULT NULL,
  "reward_number_bottom" varchar(255) DEFAULT NULL,
  "created_at" timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  "deleted_at" timestamp NULL DEFAULT NULL,

  CONSTRAINT "lotto_tickets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "lotto_tickets_status_idx" ON "lotto_tickets" ("status");
CREATE INDEX "lotto_tickets_start_date_idx" ON "lotto_tickets" ("start_date");
CREATE INDEX "lotto_tickets_end_date_idx" ON "lotto_tickets" ("end_date");
