-- The profile a downgrade keeps writable, and the only one that cannot be
-- deleted. Distinct from "isActive", which is merely what the learner is
-- looking at right now.
ALTER TABLE "user_learning_profiles" ADD COLUMN "isMain" BOOLEAN NOT NULL DEFAULT false;

-- When this profile's word is announced. It used to live on the single
-- per-user daily-word preference; the on/off switch stays there, the time
-- moves here so two profiles can be announced at different hours.
ALTER TABLE "user_learning_profiles" ADD COLUMN "reminderSlot" "NotificationSlot";

-- Backfill: the profile a learner is currently on becomes their main one,
-- oldest first when none is active. Booleans order false before true, so
-- DESC puts the active profile at the top.
UPDATE "user_learning_profiles" p
SET "isMain" = true
WHERE p."id" = (
  SELECT q."id"
  FROM "user_learning_profiles" q
  WHERE q."userId" = p."userId"
  ORDER BY q."isActive" DESC, q."createdAt" ASC
  LIMIT 1
);

-- Carry the existing reminder time onto that profile, so nobody's
-- notification moves because of this migration.
UPDATE "user_learning_profiles" p
SET "reminderSlot" = np."slot"
FROM "notification_preferences" np
WHERE np."userId" = p."userId"
  AND np."channel" = 'DAILY_WORD'
  AND np."slot" IS NOT NULL
  AND p."isMain";

-- Exactly one main profile per user. Prisma has no syntax for a partial
-- unique index, hence the hand-written statement.
CREATE UNIQUE INDEX "user_learning_profiles_main_per_user_key"
  ON "user_learning_profiles"("userId")
  WHERE "isMain";

-- One profile per slot within a user: the whole point of a per-profile
-- reminder is that two words never land together.
CREATE UNIQUE INDEX "user_learning_profiles_slot_per_user_key"
  ON "user_learning_profiles"("userId", "reminderSlot")
  WHERE "reminderSlot" IS NOT NULL;

-- Today's word becomes one per profile rather than one per user. Keying
-- it on the user made Pro's one-word-per-language impossible by
-- construction: the second profile's assignment could never be written.
DROP INDEX "daily_word_assignments_userId_assignedFor_key";

CREATE UNIQUE INDEX "daily_word_assignments_userLearningProfileId_assignedFor_key"
  ON "daily_word_assignments"("userLearningProfileId", "assignedFor");

-- The new unique index already covers lookups by profile, so its
-- standalone index is now redundant; queries that filter by user get
-- their own.
DROP INDEX "daily_word_assignments_userLearningProfileId_idx";

CREATE INDEX "daily_word_assignments_userId_idx"
  ON "daily_word_assignments"("userId");
