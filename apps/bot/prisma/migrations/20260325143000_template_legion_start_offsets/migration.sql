-- Décalage des timelines légion vs chronomètre alliance (Swordland multi-légions).
ALTER TABLE "BattleTemplate" ADD COLUMN "legion1StartOffsetMinutes" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "BattleTemplate" ADD COLUMN "legion2StartOffsetMinutes" INTEGER NOT NULL DEFAULT 0;
