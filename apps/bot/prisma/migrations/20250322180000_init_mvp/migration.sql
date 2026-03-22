-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "BattleSessionStatus" AS ENUM ('ACTIVE', 'ENDED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ReminderStatus" AS ENUM ('PENDING', 'PROCESSING', 'SENT', 'SKIPPED');

-- CreateTable (no FK to BattleTemplate yet — breaks circular dependency with BattleTemplate.guildId)
CREATE TABLE "GuildSettings" (
    "id" TEXT NOT NULL,
    "discordGuildId" TEXT NOT NULL,
    "battleChannelId" TEXT,
    "defaultTemplateId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GuildSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BattleTemplate" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BattleTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BattleEventDefinition" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "offsetSeconds" INTEGER NOT NULL,
    "key" TEXT NOT NULL,
    "messageEn" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "BattleEventDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BattleSession" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "starterUserId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "status" "BattleSessionStatus" NOT NULL DEFAULT 'ACTIVE',

    CONSTRAINT "BattleSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BattleReminder" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "messageEn" TEXT NOT NULL,
    "eventDefinitionId" TEXT,
    "status" "ReminderStatus" NOT NULL DEFAULT 'PENDING',
    "sentAt" TIMESTAMP(3),

    CONSTRAINT "BattleReminder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlayerAssignment" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "sessionId" TEXT,
    "slotLabel" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlayerAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GuildSettings_discordGuildId_key" ON "GuildSettings"("discordGuildId");

-- CreateIndex
CREATE UNIQUE INDEX "BattleTemplate_guildId_name_key" ON "BattleTemplate"("guildId", "name");

-- CreateIndex
CREATE INDEX "GuildSettings_discordGuildId_idx" ON "GuildSettings"("discordGuildId");

-- CreateIndex
CREATE INDEX "BattleTemplate_guildId_idx" ON "BattleTemplate"("guildId");

-- CreateIndex
CREATE INDEX "BattleEventDefinition_templateId_idx" ON "BattleEventDefinition"("templateId");

-- CreateIndex
CREATE INDEX "BattleSession_guildId_status_idx" ON "BattleSession"("guildId", "status");

-- CreateIndex
CREATE INDEX "BattleSession_channelId_idx" ON "BattleSession"("channelId");

-- CreateIndex
CREATE INDEX "BattleReminder_sessionId_status_idx" ON "BattleReminder"("sessionId", "status");

-- CreateIndex
CREATE INDEX "BattleReminder_scheduledAt_status_idx" ON "BattleReminder"("scheduledAt", "status");

-- CreateIndex
CREATE INDEX "PlayerAssignment_guildId_sessionId_idx" ON "PlayerAssignment"("guildId", "sessionId");

-- AddForeignKey
ALTER TABLE "BattleTemplate" ADD CONSTRAINT "BattleTemplate_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "GuildSettings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuildSettings" ADD CONSTRAINT "GuildSettings_defaultTemplateId_fkey" FOREIGN KEY ("defaultTemplateId") REFERENCES "BattleTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BattleEventDefinition" ADD CONSTRAINT "BattleEventDefinition_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "BattleTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BattleSession" ADD CONSTRAINT "BattleSession_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "GuildSettings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BattleSession" ADD CONSTRAINT "BattleSession_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "BattleTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BattleReminder" ADD CONSTRAINT "BattleReminder_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "BattleSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerAssignment" ADD CONSTRAINT "PlayerAssignment_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "GuildSettings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerAssignment" ADD CONSTRAINT "PlayerAssignment_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "BattleSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- One ACTIVE battle session per guild (business rule).
CREATE UNIQUE INDEX "BattleSession_one_active_per_guild" ON "BattleSession" ("guildId") WHERE status = 'ACTIVE';
