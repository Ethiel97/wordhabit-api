/*
  Warnings:

  - A unique constraint covering the columns `[userId]` on the table `user_learning_streaks` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "user_learning_streaks_userId_key" ON "user_learning_streaks"("userId");
