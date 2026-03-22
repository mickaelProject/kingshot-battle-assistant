-- AlterTable
ALTER TABLE "BattleSession" ADD COLUMN "isPaused" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "ManagedEventRunLog" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ManagedEventRunLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ManagedEventRunLog_runId_createdAt_idx" ON "ManagedEventRunLog"("runId", "createdAt");

-- AddForeignKey
ALTER TABLE "ManagedEventRunLog" ADD CONSTRAINT "ManagedEventRunLog_runId_fkey" FOREIGN KEY ("runId") REFERENCES "ManagedEventRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
