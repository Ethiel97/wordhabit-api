-- CreateEnum
CREATE TYPE "BadgeCode" AS ENUM ('STREAK_30', 'STREAK_50', 'STREAK_150', 'STREAK_200', 'HABIT_MASTER', 'COLLECTOR_50', 'COLLECTOR_100', 'COLLECTOR_150', 'COLLECTOR_200', 'WORD_EXPLORER', 'FLUENT_LEARNER', 'BILINGUAL_PRO', 'QUIZ_CHAMPION');

-- CreateTable
CREATE TABLE "user_badges" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "code" "BadgeCode" NOT NULL,
    "earnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_badges_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_badges_userId_earnedAt_idx" ON "user_badges"("userId", "earnedAt");

-- CreateIndex
CREATE UNIQUE INDEX "user_badges_userId_code_key" ON "user_badges"("userId", "code");

-- AddForeignKey
ALTER TABLE "user_badges" ADD CONSTRAINT "user_badges_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
