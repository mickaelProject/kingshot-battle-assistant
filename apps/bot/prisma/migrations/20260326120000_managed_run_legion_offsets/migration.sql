-- Décalages légion saisis au lancement (vs horloge alliance / scheduledAt).
ALTER TABLE "ManagedEventRun" ADD COLUMN "legion1StartOffsetMinutes" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "ManagedEventRun" ADD COLUMN "legion2StartOffsetMinutes" INTEGER NOT NULL DEFAULT 0;
