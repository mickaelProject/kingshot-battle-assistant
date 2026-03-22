-- CreateEnum
CREATE TYPE "TemplateCreationSource" AS ENUM ('MANUAL', 'ROSTER_GENERATED');

-- AlterTable
ALTER TABLE "BattleTemplate" ADD COLUMN "creationSource" "TemplateCreationSource" NOT NULL DEFAULT 'MANUAL';
