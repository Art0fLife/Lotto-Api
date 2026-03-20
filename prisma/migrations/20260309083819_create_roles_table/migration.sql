-- This is an empty migration.
CREATE TABLE "roles" (
  "id" SERIAL NOT NULL,
  "name" varchar(255) NOT NULL,
  "created_at" timestamp NULL DEFAULT NULL,
  "updated_at" timestamp NULL DEFAULT NULL
);

ALTER TABLE "roles" ADD PRIMARY KEY ("id");

INSERT INTO "roles" ("id", "name", "created_at", "updated_at") VALUES
(1, 'superadmin', '2020-10-26 13:58:43', '2020-10-26 13:58:43'),
(2, 'admin', '2020-10-26 13:58:43', '2020-10-26 13:58:43'),
(3, 'user', '2020-10-26 13:58:43', '2020-10-26 13:58:43');