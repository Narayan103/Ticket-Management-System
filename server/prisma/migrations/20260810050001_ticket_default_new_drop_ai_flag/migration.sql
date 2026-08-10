-- AlterTable
ALTER TABLE "Ticket" ALTER COLUMN "status" SET DEFAULT 'NEW';

-- AlterTable
ALTER TABLE "Ticket" DROP COLUMN "resolvedByAi";
