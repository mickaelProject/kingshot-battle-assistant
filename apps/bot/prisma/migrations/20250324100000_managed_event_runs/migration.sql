-- CreateEnum
CREATE TYPE "ManagedEventStatus" AS ENUM ('SCHEDULED', 'ACTIVE', 'COMPLETED', 'CANCELLED', 'FAILED');

-- CreateTable
CREATE TABLE "ManagedEventRun" (
    "id" TEXT NOT NULL,
    "guildSettingsId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "status" "ManagedEventStatus" NOT NULL DEFAULT 'SCHEDULED',
    "battleSessionId" TEXT,
    "errorMessage" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ManagedEventRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ManagedEventRun_battleSessionId_key" ON "ManagedEventRun"("battleSessionId");

-- CreateIndex
CREATE INDEX "ManagedEventRun_guildSettingsId_status_idx" ON "ManagedEventRun"("guildSettingsId", "status");

-- CreateIndex
CREATE INDEX "ManagedEventRun_status_scheduledAt_idx" ON "ManagedEventRun"("status", "scheduledAt");

-- AddForeignKey
ALTER TABLE "ManagedEventRun" ADD CONSTRAINT "ManagedEventRun_guildSettingsId_fkey" FOREIGN KEY ("guildSettingsId") REFERENCES "GuildSettings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManagedEventRun" ADD CONSTRAINT "ManagedEventRun_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "BattleTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManagedEventRun" ADD CONSTRAINT "ManagedEventRun_battleSessionId_fkey" FOREIGN KEY ("battleSessionId") REFERENCES "BattleSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;
