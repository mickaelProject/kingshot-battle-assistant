-- Heures absolues UTC par légion (remplace les décalages en minutes).
ALTER TABLE "ManagedEventRun" ADD COLUMN "legion1StartsAt" TIMESTAMP(3);
ALTER TABLE "ManagedEventRun" ADD COLUMN "legion2StartsAt" TIMESTAMP(3);

UPDATE "ManagedEventRun" SET
  "legion1StartsAt" = CASE
    WHEN "legion1StartOffsetMinutes" > 0
    THEN "scheduledAt" + ("legion1StartOffsetMinutes" * interval '1 minute')
    ELSE NULL
  END,
  "legion2StartsAt" = CASE
    WHEN "legion2StartOffsetMinutes" > 0
    THEN "scheduledAt" + ("legion2StartOffsetMinutes" * interval '1 minute')
    ELSE NULL
  END;

ALTER TABLE "ManagedEventRun" DROP COLUMN "legion1StartOffsetMinutes";
ALTER TABLE "ManagedEventRun" DROP COLUMN "legion2StartOffsetMinutes";
