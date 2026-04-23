-- CreateTable
CREATE TABLE "themes" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "themes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vocabulary_word_themes" (
    "wordId" TEXT NOT NULL,
    "themeId" TEXT NOT NULL,

    CONSTRAINT "vocabulary_word_themes_pkey" PRIMARY KEY ("wordId","themeId")
);

-- CreateIndex
CREATE UNIQUE INDEX "themes_name_key" ON "themes"("name");

-- CreateIndex
CREATE UNIQUE INDEX "themes_slug_key" ON "themes"("slug");

-- CreateIndex
CREATE INDEX "vocabulary_word_themes_themeId_idx" ON "vocabulary_word_themes"("themeId");

-- AddForeignKey
ALTER TABLE "vocabulary_word_themes" ADD CONSTRAINT "vocabulary_word_themes_wordId_fkey" FOREIGN KEY ("wordId") REFERENCES "vocabulary_words"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vocabulary_word_themes" ADD CONSTRAINT "vocabulary_word_themes_themeId_fkey" FOREIGN KEY ("themeId") REFERENCES "themes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
