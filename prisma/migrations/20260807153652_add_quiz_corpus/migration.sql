-- CreateTable
CREATE TABLE "word_antonyms" (
    "id" TEXT NOT NULL,
    "wordId" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "word_antonyms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "word_quiz_scenarios" (
    "id" TEXT NOT NULL,
    "wordId" TEXT NOT NULL,
    "language" "LanguageCode" NOT NULL,
    "situation" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "correct" TEXT NOT NULL,
    "distractors" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "word_quiz_scenarios_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "word_antonyms_wordId_idx" ON "word_antonyms"("wordId");

-- CreateIndex
CREATE INDEX "word_quiz_scenarios_wordId_language_idx" ON "word_quiz_scenarios"("wordId", "language");

-- AddForeignKey
ALTER TABLE "word_antonyms" ADD CONSTRAINT "word_antonyms_wordId_fkey" FOREIGN KEY ("wordId") REFERENCES "vocabulary_words"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "word_quiz_scenarios" ADD CONSTRAINT "word_quiz_scenarios_wordId_fkey" FOREIGN KEY ("wordId") REFERENCES "vocabulary_words"("id") ON DELETE CASCADE ON UPDATE CASCADE;
