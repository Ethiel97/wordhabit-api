-- CreateTable
CREATE TABLE "daily_word_assignments" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userLearningProfileId" TEXT NOT NULL,
    "wordId" TEXT NOT NULL,
    "assignedFor" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "daily_word_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_word_progress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "wordId" TEXT NOT NULL,
    "masteryLevel" INTEGER NOT NULL DEFAULT 0,
    "reviewCount" INTEGER NOT NULL DEFAULT 0,
    "lastReviewedAt" TIMESTAMP(3),
    "nextReviewAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_word_progress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "daily_word_assignments_userLearningProfileId_idx" ON "daily_word_assignments"("userLearningProfileId");

-- CreateIndex
CREATE INDEX "daily_word_assignments_wordId_idx" ON "daily_word_assignments"("wordId");

-- CreateIndex
CREATE UNIQUE INDEX "daily_word_assignments_userId_assignedFor_key" ON "daily_word_assignments"("userId", "assignedFor");

-- CreateIndex
CREATE INDEX "user_word_progress_nextReviewAt_idx" ON "user_word_progress"("nextReviewAt");

-- CreateIndex
CREATE UNIQUE INDEX "user_word_progress_userId_wordId_key" ON "user_word_progress"("userId", "wordId");

-- CreateIndex
CREATE INDEX "user_learning_profiles_userId_idx" ON "user_learning_profiles"("userId");

-- CreateIndex
CREATE INDEX "user_learning_profiles_id_idx" ON "user_learning_profiles"("id");

-- AddForeignKey
ALTER TABLE "daily_word_assignments" ADD CONSTRAINT "daily_word_assignments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_word_assignments" ADD CONSTRAINT "daily_word_assignments_userLearningProfileId_fkey" FOREIGN KEY ("userLearningProfileId") REFERENCES "user_learning_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_word_assignments" ADD CONSTRAINT "daily_word_assignments_wordId_fkey" FOREIGN KEY ("wordId") REFERENCES "vocabulary_words"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_word_progress" ADD CONSTRAINT "user_word_progress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_word_progress" ADD CONSTRAINT "user_word_progress_wordId_fkey" FOREIGN KEY ("wordId") REFERENCES "vocabulary_words"("id") ON DELETE CASCADE ON UPDATE CASCADE;
