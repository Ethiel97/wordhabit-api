-- Postgres compares strings case-sensitively, so `Clau.beke@` and
-- `clau.beke@` were two accounts for one person: registration stored the
-- address as typed while social sign-in and login both lowercased it.
-- The application now normalizes on every write; this index makes the
-- mistake impossible to repeat from any other path.
--
-- Existing rows are folded first. The update is safe only because the
-- duplicates it would collide with have been resolved by hand; if any
-- remain, the index creation below fails and the migration aborts —
-- which is the intended outcome, not a regression.
UPDATE "users" SET "email" = lower(btrim("email")) WHERE "email" <> lower(btrim("email"));

CREATE UNIQUE INDEX "users_email_lower_key" ON "users" (lower("email"));
