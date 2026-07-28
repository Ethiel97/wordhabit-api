-- Difficulty of the daily words this profile should draw from, chosen
-- during setup. Nullable on purpose: profiles that predate the level
-- step have no answer, and NULL means "draw from every difficulty",
-- which is the behaviour those users already have.
ALTER TABLE "user_learning_profiles"
  ADD COLUMN "difficulty" "WordDifficulty";
