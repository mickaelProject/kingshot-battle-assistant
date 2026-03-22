-- Vue joueur + intelligence produit (léger)
ALTER TABLE "BattleTemplate" ADD COLUMN "eventProductKey" TEXT;

ALTER TABLE "PlayerAssignment" ADD COLUMN "legionIndex" INTEGER;
ALTER TABLE "PlayerAssignment" ADD COLUMN "side" TEXT;
ALTER TABLE "PlayerAssignment" ADD COLUMN "buildingKey" TEXT;
ALTER TABLE "PlayerAssignment" ADD COLUMN "leaderName" TEXT;
