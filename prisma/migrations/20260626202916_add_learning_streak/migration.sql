-- CreateTable
CREATE TABLE "user_learning_streaks" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "currentStreak" INTEGER NOT NULL DEFAULT 0,
    "longestStreak" INTEGER NOT NULL DEFAULT 0,
    "lastActivityDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_learning_streaks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_learning_streaks_userId_idx" ON "user_learning_streaks"("userId");

-- AddForeignKey
ALTER TABLE "user_learning_streaks" ADD CONSTRAINT "user_learning_streaks_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
