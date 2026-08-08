/*
  Warnings:

  - The primary key for the `Ticket` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `Ticket` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Added the required column `body` to the `Ticket` table without a default value. This is not possible if the table is not empty.
  - Added the required column `fromEmail` to the `Ticket` table without a default value. This is not possible if the table is not empty.
  - Added the required column `fromName` to the `Ticket` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Ticket" DROP CONSTRAINT "Ticket_pkey",
ADD COLUMN     "assignedToId" TEXT,
ADD COLUMN     "body" TEXT NOT NULL,
ADD COLUMN     "fromEmail" TEXT NOT NULL,
ADD COLUMN     "fromName" TEXT NOT NULL,
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
ALTER COLUMN "category" DROP NOT NULL,
ADD CONSTRAINT "Ticket_pkey" PRIMARY KEY ("id");

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "AuthUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
