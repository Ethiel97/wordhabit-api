-- AlterTable
ALTER TABLE "user_learning_streaks" ADD COLUMN     "brokenOnLocalDate" VARCHAR(10),
ADD COLUMN     "brokenStreak" INTEGER;

-- CreateTable
CREATE TABLE "user_streak_repairs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "repairedLocalDate" VARCHAR(10) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_streak_repairs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_streak_repairs_userId_createdAt_idx" ON "user_streak_repairs"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "user_streak_repairs_userId_repairedLocalDate_key" ON "user_streak_repairs"("userId", "repairedLocalDate");

-- AddForeignKey
ALTER TABLE "user_streak_repairs" ADD CONSTRAINT "user_streak_repairs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
