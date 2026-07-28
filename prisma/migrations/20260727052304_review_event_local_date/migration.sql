-- Records the calendar day each review belonged to, as `yyyy-MM-dd` text.
-- Added in three steps so the existing rows survive: the column arrives
-- nullable, gets backfilled, then becomes required.

-- DropIndex: day grouping no longer scans the instant.
DROP INDEX "user_word_review_events_userId_reviewedAt_idx";

-- AlterTable
ALTER TABLE "user_word_review_events" ADD COLUMN "localDate" VARCHAR(10);

-- Backfill. Pre-existing rows have no recorded local day, so the UTC date
-- of the instant is the best available approximation; going forward the
-- client supplies the real one.
UPDATE "user_word_review_events"
SET "localDate" = to_char("reviewedAt", 'YYYY-MM-DD')
WHERE "localDate" IS NULL;

ALTER TABLE "user_word_review_events" ALTER COLUMN "localDate" SET NOT NULL;

-- CreateIndex
CREATE INDEX "user_word_review_events_userId_localDate_idx" ON "user_word_review_events"("userId", "localDate");
