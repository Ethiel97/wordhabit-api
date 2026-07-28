-- CreateTable
CREATE TABLE "user_word_review_events" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "wordId" TEXT NOT NULL,
    "correct" BOOLEAN NOT NULL,
    "reviewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_word_review_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_word_review_events_userId_reviewedAt_idx" ON "user_word_review_events"("userId", "reviewedAt");

-- CreateIndex
CREATE INDEX "user_word_review_events_wordId_idx" ON "user_word_review_events"("wordId");

-- AddForeignKey
ALTER TABLE "user_word_review_events" ADD CONSTRAINT "user_word_review_events_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_word_review_events" ADD CONSTRAINT "user_word_review_events_wordId_fkey" FOREIGN KEY ("wordId") REFERENCES "vocabulary_words"("id") ON DELETE CASCADE ON UPDATE CASCADE;
