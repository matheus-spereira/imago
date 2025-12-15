/*
  Warnings:

  - You are about to drop the column `passowrd` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "User" DROP COLUMN "passowrd",
ADD COLUMN     "password" TEXT;
