-- DropIndex
DROP INDEX "devices_platform_idx";

-- DropIndex
DROP INDEX "devices_userId_idx";

-- DropIndex
DROP INDEX "favorite_words_userId_idx";

-- DropIndex
DROP INDEX "notification_deliveries_channel_idx";

-- DropIndex
DROP INDEX "notification_deliveries_userId_idx";

-- DropIndex
DROP INDEX "notification_preferences_userId_idx";

-- DropIndex
DROP INDEX "user_learning_profiles_id_idx";

-- DropIndex
DROP INDEX "user_learning_profiles_userId_idx";

-- DropIndex
DROP INDEX "user_word_progress_nextReviewOn_idx";

-- DropIndex
DROP INDEX "user_word_progress_userId_status_idx";

-- DropIndex
DROP INDEX "vocabulary_words_targetLanguage_idx";

-- CreateIndex
CREATE INDEX "devices_userId_timeZone_idx" ON "devices"("userId", "timeZone");

-- CreateIndex
CREATE INDEX "user_word_progress_userId_status_nextReviewOn_idx" ON "user_word_progress"("userId", "status", "nextReviewOn");

-- CreateIndex
CREATE INDEX "user_word_progress_userId_updatedAt_idx" ON "user_word_progress"("userId", "updatedAt");

-- CreateIndex
CREATE INDEX "vocabulary_words_targetLanguage_difficulty_idx" ON "vocabulary_words"("targetLanguage", "difficulty");
