import { BattlePhaseType } from "@prisma/client";

const VALUES = new Set<string>(Object.values(BattlePhaseType));

export function parseBattlePhaseType(raw: string): BattlePhaseType | null {
  const u = raw.trim().toUpperCase();
  return VALUES.has(u) ? (u as BattlePhaseType) : null;
}
