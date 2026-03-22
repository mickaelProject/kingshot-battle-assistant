import type { BattlePhaseType } from "@prisma/client";
import type { TimelineScope } from "@/lib/timeline-scope";

export type RosterEventType =
  | "GENERIC"
  | "RALLY"
  | "FIELD_BATTLE"
  | "SIEGE";

export type PlayStyle = "aggressive" | "balanced" | "defensive";

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
  /** Présent pour Swordland multi-légions : seules les phases GLOBAL sont postées sur Discord. */
  timelineScope?: TimelineScope;
};

export type RosterGenerationInput = {
  players: RosterPlayer[];
  eventType: RosterEventType;
  /** Officer free-text constraints / style. */
  notes: string;
  /** Durée événement in-game — la timeline générée va de T+0 à T+durée. */
  eventDurationMinutes: number;
  playStyle: PlayStyle;
  /** Timeline type Swordland Showdown (repères fixes mis à l’échelle sur la durée). */
  swordlandShowdownPreset?: boolean;
};
