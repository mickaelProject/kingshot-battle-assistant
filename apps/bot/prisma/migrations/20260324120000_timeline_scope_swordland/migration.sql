-- Timelines multi-portées (GLOBAL / Légions) + champs tactiques Swordland
CREATE TYPE "TimelineScope" AS ENUM ('GLOBAL', 'LEGION_1', 'LEGION_2');

ALTER TABLE "BattleEventDefinition" ADD COLUMN "timelineScope" "TimelineScope" NOT NULL DEFAULT 'GLOBAL';
ALTER TABLE "BattleEventDefinition" ADD COLUMN "targetedBuildings" JSONB;
ALTER TABLE "BattleEventDefinition" ADD COLUMN "assignedLeaders" JSONB;
ALTER TABLE "BattleEventDefinition" ADD COLUMN "assignedPlayers" JSONB;
ALTER TABLE "BattleEventDefinition" ADD COLUMN "customDiscordText" TEXT;
ALTER TABLE "BattleEventDefinition" ADD COLUMN "generatedDiscordDraft" TEXT;

CREATE INDEX "BattleEventDefinition_templateId_timelineScope_idx" ON "BattleEventDefinition"("templateId", "timelineScope");
