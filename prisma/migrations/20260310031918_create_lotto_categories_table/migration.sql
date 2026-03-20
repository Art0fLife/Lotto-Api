-- CreateTable
CREATE TABLE "lotto_categories" (
  "id" SERIAL NOT NULL,
  "name" varchar(255) NOT NULL,
  "pay_rate" smallint NOT NULL DEFAULT 0,
  "created_at" timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  "deleted_at" timestamp NULL DEFAULT NULL,

  CONSTRAINT "lotto_categories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "lotto_categories_name_key" ON "lotto_categories" ("name");

-- InsertData
INSERT INTO "lotto_categories" ("name", "pay_rate") VALUES ('2 ตัวบน', 70);
INSERT INTO "lotto_categories" ("name", "pay_rate") VALUES ('2 ตัวล่าง', 7);
INSERT INTO "lotto_categories" ("name", "pay_rate") VALUES ('3 ตัวบน', 400);
INSERT INTO "lotto_categories" ("name", "pay_rate") VALUES ('3 ตัวล่าง', 0);
INSERT INTO "lotto_categories" ("name", "pay_rate") VALUES ('3 ตัวโต๊ด', 80);
INSERT INTO "lotto_categories" ("name", "pay_rate") VALUES ('วิ่งบน', 3);
INSERT INTO "lotto_categories" ("name", "pay_rate") VALUES ('วิ่งล่าง', 2);

