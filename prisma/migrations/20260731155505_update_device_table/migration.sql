/*
  Warnings:

  - You are about to drop the column `timezone` on the `devices` table. All the data in the column will be lost.
  - Added the required column `timeZone` to the `devices` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "devices_timezone_idx";

-- AlterTable
ALTER TABLE "devices" DROP COLUMN "timezone",
ADD COLUMN     "timeZone" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "devices_timeZone_idx" ON "devices"("timeZone");
