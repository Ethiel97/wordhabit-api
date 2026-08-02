-- Replaces the review instant with the learner's calendar day.
--
-- "Review in 3 days" is a day, not a time of day: stored as an instant it
-- came back at whatever o'clock the learner happened to answer, so a
-- 7:30 reminder found an empty queue by minutes.

-- AlterTable
ALTER TABLE "user_word_progress" ADD COLUMN "nextReviewOn" VARCHAR(10);

-- Backfill: read the existing instant as the UTC day it encodes, matching
-- how the application now writes days.
UPDATE "user_word_progress"
SET "nextReviewOn" = to_char("nextReviewAt" AT TIME ZONE 'UTC', 'YYYY-MM-DD')
WHERE "nextReviewAt" IS NOT NULL;

-- DropIndex
DROP INDEX "user_word_progress_nextReviewAt_idx";

-- AlterTable
ALTER TABLE "user_word_progress" DROP COLUMN "nextReviewAt";

-- CreateIndex
CREATE INDEX "user_word_progress_nextReviewOn_idx" ON "user_word_progress"("nextReviewOn");
