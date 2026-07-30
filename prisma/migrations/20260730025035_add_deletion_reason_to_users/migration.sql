-- CreateEnum
CREATE TYPE "AccountDeletionReason" AS ENUM ('TOO_MANY_NOTIFICATIONS', 'LOST_MY_STREAK', 'NOT_LEARNING_ENOUGH', 'TOO_EXPENSIVE', 'FOUND_BETTER', 'OTHER');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "deletionReason" "AccountDeletionReason";

-- CreateIndex
CREATE INDEX "users_deletedAt_idx" ON "users"("deletedAt");
