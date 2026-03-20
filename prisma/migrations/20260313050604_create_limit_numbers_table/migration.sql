CREATE TABLE "limit_numbers" (
  "id" SERIAL PRIMARY KEY,
  "lotto_ticket_id" INTEGER NOT NULL,
  "code" VARCHAR(10) NOT NULL,
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "deleted_at" TIMESTAMP NULL
);

-- index สำหรับ query ตามงวด
CREATE INDEX "limit_numbers_lotto_ticket_id_idx"
ON "limit_numbers" ("lotto_ticket_id");

-- ป้องกันเลขซ้ำในงวดเดียว
CREATE UNIQUE INDEX "limit_numbers_unique_ticket_code"
ON "limit_numbers" ("lotto_ticket_id", "code")
WHERE deleted_at IS NULL;