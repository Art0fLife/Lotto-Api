-- CreateTable
CREATE TABLE "admins" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password" VARCHAR(255) NOT NULL,
    "verifyToken" VARCHAR(255),
    "role_id" SMALLINT NOT NULL DEFAULT 0,
    "status" SMALLINT NOT NULL DEFAULT 0,
    "remember_token" VARCHAR(100),
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6),
    "deleted_at" TIMESTAMP(6) DEFAULT NULL,

    CONSTRAINT "admins_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "admins_email_key" ON "admins"("email");

insert into "admins" ("name", "email", "password", "status", "role_id") values ('Superadmin', 'superadmin@lotto.com', '$2b$12$WGkp7UgA/.jTgezIg4u.juo4S0/DkD3Fd3baXzSTMycIum5PuhpuO', 1, 1);
insert into "admins" ("name", "email", "password", "status", "role_id") values ('User1', 'user1@lotto.com', '$2b$12$WGkp7UgA/.jTgezIg4u.juo4S0/DkD3Fd3baXzSTMycIum5PuhpuO', 1, 3);
insert into "admins" ("name", "email", "password", "status", "role_id") values ('User2', 'user2@lotto.com', '$2b$12$WGkp7UgA/.jTgezIg4u.juo4S0/DkD3Fd3baXzSTMycIum5PuhpuO', 1, 3);
