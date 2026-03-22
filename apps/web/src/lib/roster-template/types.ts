import type { BattlePhaseType } from "@prisma/client";

export type RosterEventType =
  | "GENERIC"
  | "RALLY"
  | "FIELD_BATTLE"
  | "SIEGE";

export type RosterPlayer = {
  name: string;
  power: number;
};

/** One row for Prisma `BattleEventDefinition`. */
export type GeneratedRosterPhase = {
  offsetSeconds: number;
  phaseType: BattlePhaseType;
  title: string;
  objective: string;
  action: string;
  nextHint: string;
  orderIndex: number;
  key: string;
};

export type RosterGenerationInput = {
  players: RosterPlayer[];
  eventType: RosterEventType;
  /** Officer free-text constraints / style. */
  notes: string;
};
