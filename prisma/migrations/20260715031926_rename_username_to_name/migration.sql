-- Rename users.username to users.name and drop the handle-oriented indexes.
DROP INDEX "users_username_idx";

DROP INDEX "users_username_key";

ALTER TABLE "users" RENAME COLUMN "username" TO "name";
