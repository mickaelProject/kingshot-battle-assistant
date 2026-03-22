-- Durée d’événement (in-game) séparée de la timeline d’embeds Discord
ALTER TABLE "BattleTemplate" ADD COLUMN "eventDurationMinutes" INTEGER NOT NULL DEFAULT 60;
