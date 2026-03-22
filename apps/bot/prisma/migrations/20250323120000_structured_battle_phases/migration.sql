-- Structured battle phases (event manager shape) + reminder snapshots.

CREATE TYPE "BattlePhaseType" AS ENUM ('START', 'OBJECTIVE', 'REMINDER', 'FINAL');

ALTER TABLE "BattleEventDefinition"
ADD COLUMN "phaseType" "BattlePhaseType" NOT NULL DEFAULT 'REMINDER',
ADD COLUMN "title" TEXT NOT NULL DEFAULT '',
ADD COLUMN "objective" TEXT NOT NULL DEFAULT '',
ADD COLUMN "action" TEXT NOT NULL DEFAULT '',
ADD COLUMN "nextHint" TEXT NOT NULL DEFAULT '';

UPDATE "BattleEventDefinition"
SET
  "title" = LEFT(COALESCE(NULLIF(TRIM("messageEn"), ''), 'Phase'), 200),
  "action" = COALESCE("messageEn", '')
WHERE "title" = '';

ALTER TABLE "BattleEventDefinition" DROP COLUMN "messageEn";

ALTER TABLE "BattleReminder"
ADD COLUMN "phaseType" "BattlePhaseType" NOT NULL DEFAULT 'REMINDER',
ADD COLUMN "title" TEXT NOT NULL DEFAULT '',
ADD COLUMN "objective" TEXT NOT NULL DEFAULT '',
ADD COLUMN "action" TEXT NOT NULL DEFAULT '',
ADD COLUMN "nextHint" TEXT NOT NULL DEFAULT '';

UPDATE "BattleReminder"
SET
  "title" = LEFT(COALESCE(NULLIF(TRIM("messageEn"), ''), 'Reminder'), 200),
  "action" = COALESCE("messageEn", '')
WHERE "title" = '';

ALTER TABLE "BattleReminder" DROP COLUMN "messageEn";
