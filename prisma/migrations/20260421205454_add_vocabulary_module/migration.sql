-- CreateEnum
CREATE TYPE "LanguageCode" AS ENUM ('EN', 'ES', 'FR');

-- CreateEnum
CREATE TYPE "VocabularyWordStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "WordDifficulty" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED');

-- CreateEnum
CREATE TYPE "PartOfSpeech" AS ENUM ('NOUN', 'VERB', 'ADJECTIVE', 'ADVERB', 'EXPRESSION', 'OTHER');

-- CreateTable
CREATE TABLE "vocabulary_words" (
    "id" TEXT NOT NULL,
    "term" TEXT NOT NULL,
    "normalizedTerm" TEXT NOT NULL,
    "targetLanguage" "LanguageCode" NOT NULL,
    "difficulty" "WordDifficulty" NOT NULL,
    "partOfSpeech" "PartOfSpeech" NOT NULL,
    "status" "VocabularyWordStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vocabulary_words_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "word_definitions" (
    "id" TEXT NOT NULL,
    "wordId" TEXT NOT NULL,
    "explanationLanguage" "LanguageCode" NOT NULL,
    "text" TEXT NOT NULL,
    "register" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "word_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "word_examples" (
    "id" TEXT NOT NULL,
    "wordId" TEXT NOT NULL,
    "sentence" TEXT NOT NULL,
    "translation" TEXT,
    "translationLanguage" "LanguageCode",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "word_examples_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "word_pronunciations" (
    "id" TEXT NOT NULL,
    "wordId" TEXT NOT NULL,
    "phonetic" TEXT,
    "audioUrl" TEXT,
    "provider" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "word_pronunciations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "word_synonyms" (
    "id" TEXT NOT NULL,
    "wordId" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "word_synonyms_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "vocabulary_words_targetLanguage_idx" ON "vocabulary_words"("targetLanguage");

-- CreateIndex
CREATE UNIQUE INDEX "vocabulary_words_normalizedTerm_targetLanguage_key" ON "vocabulary_words"("normalizedTerm", "targetLanguage");

-- CreateIndex
CREATE INDEX "word_definitions_wordId_idx" ON "word_definitions"("wordId");

-- CreateIndex
CREATE INDEX "word_definitions_explanationLanguage_idx" ON "word_definitions"("explanationLanguage");

-- CreateIndex
CREATE INDEX "word_examples_wordId_idx" ON "word_examples"("wordId");

-- CreateIndex
CREATE INDEX "word_pronunciations_wordId_idx" ON "word_pronunciations"("wordId");

-- CreateIndex
CREATE INDEX "word_synonyms_wordId_idx" ON "word_synonyms"("wordId");

-- AddForeignKey
ALTER TABLE "word_definitions" ADD CONSTRAINT "word_definitions_wordId_fkey" FOREIGN KEY ("wordId") REFERENCES "vocabulary_words"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "word_examples" ADD CONSTRAINT "word_examples_wordId_fkey" FOREIGN KEY ("wordId") REFERENCES "vocabulary_words"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "word_pronunciations" ADD CONSTRAINT "word_pronunciations_wordId_fkey" FOREIGN KEY ("wordId") REFERENCES "vocabulary_words"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "word_synonyms" ADD CONSTRAINT "word_synonyms_wordId_fkey" FOREIGN KEY ("wordId") REFERENCES "vocabulary_words"("id") ON DELETE CASCADE ON UPDATE CASCADE;
