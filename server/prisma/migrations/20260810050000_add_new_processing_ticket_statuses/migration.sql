-- AlterEnum
-- Postgres requires a new enum value to be committed before it can be used
-- (e.g. as a column default), so this is a separate migration from the one
-- that sets Ticket.status's default to 'NEW'.
ALTER TYPE "TicketStatus" ADD VALUE 'NEW' BEFORE 'OPEN';
ALTER TYPE "TicketStatus" ADD VALUE 'PROCESSING' AFTER 'NEW';
