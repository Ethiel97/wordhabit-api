-- Only rows nobody edited since seeding: a learner who switched the nudge off keeps it off.
UPDATE "notification_preferences"
SET "enabled" = true
WHERE "channel" = 'STREAK_RISK'
  AND "enabled" = false
  AND "updatedAt" <= "createdAt";
