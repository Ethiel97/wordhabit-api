-- The daily word is announced once per language, so a delivery belongs
-- to a profile. Null on channels that speak to the person rather than to
-- one of their languages, like the streak reminder.
ALTER TABLE "notification_deliveries" ADD COLUMN "userLearningProfileId" TEXT;

ALTER TABLE "notification_deliveries"
  ADD CONSTRAINT "notification_deliveries_userLearningProfileId_fkey"
  FOREIGN KEY ("userLearningProfileId") REFERENCES "user_learning_profiles"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- Existing daily-word rows belong to the profile that was active, which
-- before today was the only one that could hold an assignment.
UPDATE "notification_deliveries" d
SET "userLearningProfileId" = p."id"
FROM "user_learning_profiles" p
WHERE p."userId" = d."userId"
  AND p."isActive"
  AND d."channel" = 'DAILY_WORD';

DROP INDEX "notification_deliveries_userId_channel_localDate_key";

-- Two partial indexes rather than one composite: Postgres treats NULLs
-- as distinct, so a plain unique on a nullable column would let the
-- person-level channels record the same day twice.
CREATE UNIQUE INDEX "notification_deliveries_per_profile_key"
  ON "notification_deliveries"("userLearningProfileId", "channel", "localDate")
  WHERE "userLearningProfileId" IS NOT NULL;

CREATE UNIQUE INDEX "notification_deliveries_per_user_key"
  ON "notification_deliveries"("userId", "channel", "localDate")
  WHERE "userLearningProfileId" IS NULL;

CREATE INDEX "notification_deliveries_userId_channel_localDate_idx"
  ON "notification_deliveries"("userId", "channel", "localDate");

CREATE INDEX "notification_deliveries_userLearningProfileId_idx"
  ON "notification_deliveries"("userLearningProfileId");
