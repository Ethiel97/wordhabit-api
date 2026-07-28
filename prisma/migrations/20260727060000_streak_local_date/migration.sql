-- Replaces the streak's instant with the calendar day the user reported.
--
-- Deciding "today vs yesterday vs broken" from a timestamp used the
-- server's timezone, so an evening review in a western zone counted as the
-- next day: the streak could increment twice in one local day, or treat two
-- distinct days as one. The day is now recorded, not inferred.

ALTER TABLE "user_learning_streaks" ADD COLUMN "lastActivityLocalDate" VARCHAR(10);

-- Backfill: the UTC date of the old instant is the closest available
-- approximation for existing rows.
UPDATE "user_learning_streaks"
SET "lastActivityLocalDate" = to_char("lastActivityDate", 'YYYY-MM-DD')
WHERE "lastActivityDate" IS NOT NULL;

ALTER TABLE "user_learning_streaks" DROP COLUMN "lastActivityDate";
