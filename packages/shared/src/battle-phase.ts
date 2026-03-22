/** Align with Prisma `BattlePhaseType` — shared for bot + future web API. */
export const BATTLE_PHASE_TYPES = [
  "START",
  "OBJECTIVE",
  "REMINDER",
  "FINAL",
] as const;

export type BattlePhaseTypeDto = (typeof BATTLE_PHASE_TYPES)[number];

/** One scheduled phase in a template (event manager shape). */
export interface BattlePhaseDefinitionDto {
  key: string;
  offsetSeconds: number;
  phaseType: BattlePhaseTypeDto;
  title: string;
  objective: string;
  action: string;
  nextHint: string;
  orderIndex: number;
}
