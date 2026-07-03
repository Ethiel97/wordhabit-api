-- CreateTable
CREATE TABLE "favorite_words" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "wordId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "favorite_words_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "favorite_words_userId_idx" ON "favorite_words"("userId");

-- CreateIndex
CREATE INDEX "favorite_words_wordId_idx" ON "favorite_words"("wordId");

-- CreateIndex
CREATE UNIQUE INDEX "favorite_words_userId_wordId_key" ON "favorite_words"("userId", "wordId");

-- AddForeignKey
ALTER TABLE "favorite_words" ADD CONSTRAINT "favorite_words_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favorite_words" ADD CONSTRAINT "favorite_words_wordId_fkey" FOREIGN KEY ("wordId") REFERENCES "vocabulary_words"("id") ON DELETE CASCADE ON UPDATE CASCADE;
