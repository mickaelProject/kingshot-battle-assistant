-- AlterEnum (PostgreSQL appends new values; Prisma enum order is defined in schema.prisma)
ALTER TYPE "ManagedEventStatus" ADD VALUE 'STARTING';

ALTER TABLE "ManagedEventRun" ADD COLUMN "channelNameSnapshot" TEXT;
