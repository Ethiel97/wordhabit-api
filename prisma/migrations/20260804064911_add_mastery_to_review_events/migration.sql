-- AlterTable
ALTER TABLE "user_word_review_events" ADD COLUMN     "masteryAfter" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "masteryBefore" INTEGER NOT NULL DEFAULT 0;
