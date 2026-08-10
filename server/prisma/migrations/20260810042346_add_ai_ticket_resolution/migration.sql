-- AlterEnum
ALTER TYPE "ReplySenderType" ADD VALUE 'AI';

-- AlterTable
ALTER TABLE "Ticket" ADD COLUMN     "resolvedByAi" BOOLEAN NOT NULL DEFAULT false;
