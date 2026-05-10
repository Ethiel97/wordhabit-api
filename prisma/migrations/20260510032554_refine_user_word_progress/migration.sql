-- CreateEnum
CREATE TYPE "UserWordProgressStatus" AS ENUM ('NEW', 'SEEN', 'LEARNING', 'MASTERED', 'SKIPPED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "LanguageCode" ADD VALUE 'DE';
ALTER TYPE "LanguageCode" ADD VALUE 'IT';

-- AlterTable
ALTER TABLE "user_word_progress" ADD COLUMN     "seenAt" TIMESTAMP(3),
ADD COLUMN     "status" "UserWordProgressStatus" NOT NULL DEFAULT 'NEW';

-- CreateIndex
CREATE INDEX "user_word_progress_userId_status_idx" ON "user_word_progress"("userId", "status");
