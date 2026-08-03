-- DropIndex
DROP INDEX "user_learning_profiles_userId_key";

-- At most one active profile per user.
--
-- Replaces the blanket uniqueness on "userId": several profiles are now
-- allowed, but exactly one may be current. A partial unique index is the
-- only way to say that in the schema rather than in application code —
-- and Prisma has no syntax for it, hence the hand-written statement.
CREATE UNIQUE INDEX "user_learning_profiles_active_per_user_key"
  ON "user_learning_profiles"("userId")
  WHERE "isActive";
