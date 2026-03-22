import type { TimelineScope } from "@/lib/timeline-scope";

/** Phase row for template editor (matches Prisma `BattleEventDefinition` fields used in UI). */
export type EditorPhase = {
  id: string;
  orderIndex: number;
  offsetSeconds: number;
  phaseType: string;
  key: string;
  title: string;
  objective: string;
  action: string;
  nextHint: string;
  timelineScope: TimelineScope;
  targetedBuildings: string[];
  assignedLeaders: string[];
  assignedPlayers: string[];
  customDiscordText: string | null;
  generatedDiscordDraft: string | null;
};

export function jsonToStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === "string");
}
