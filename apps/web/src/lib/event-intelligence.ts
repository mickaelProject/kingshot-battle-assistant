/**
 * Intelligence centrale des types d’événement : phases, structure, logique future.
 * Les clés correspondent à `BattleTemplate.eventProductKey` (ex. swordland, kvk).
 */

export type EventPhaseDef = {
  key: string;
  label: string;
  order: number;
};

/** Comment le moteur déterminera la phase courante (futur). */
export type EventPhaseResolver =
  | "template_timeline"
  | "kvk_four_phase"
  | "mobilization_wave";

export type EventTypeDefinition = {
  key: string;
  displayName: string;
  icon: string;
  phases: EventPhaseDef[];
  logic: {
    summary: string;
    resolver: EventPhaseResolver;
  };
  structure: {
    legions: boolean;
    sides: boolean;
    buildings: boolean;
  };
};

export const eventTypes = {
  swordland: {
    key: "swordland",
    displayName: "Swordland Showdown",
    icon: "🗡",
    phases: [
      { key: "brief", label: "Brief & placement", order: 0 },
      { key: "open", label: "Ouverture", order: 1 },
      { key: "mid", label: "Milieu de bataille", order: 2 },
      { key: "objectives", label: "Objectifs bâtiments", order: 3 },
      { key: "endgame", label: "Fin de jeu", order: 4 },
      { key: "debrief", label: "Clôture", order: 5 },
    ],
    logic: {
      summary:
        "Timeline alignée sur les rappels Discord + ORBAT légions / côtés / bâtiments.",
      resolver: "template_timeline",
    },
    structure: {
      legions: true,
      sides: true,
      buildings: true,
    },
  },
  kvk: {
    key: "kvk",
    displayName: "Kingdom of Power (KvK)",
    icon: "👑",
    phases: [
      { key: "matchmaking", label: "Matchmaking", order: 0 },
      { key: "preparation", label: "Préparation", order: 1 },
      { key: "battle", label: "Bataille", order: 2 },
      { key: "recovery", label: "Récupération", order: 3 },
    ],
    logic: {
      summary:
        "Structure 4 phases KvK — préparation seulement ; pas encore branchée sur la timeline ni l’UI live.",
      resolver: "kvk_four_phase",
    },
    structure: {
      legions: true,
      sides: true,
      buildings: false,
    },
  },
  mobilization: {
    key: "mobilization",
    displayName: "Alliance Mobilization",
    icon: "📣",
    phases: [
      { key: "rally", label: "Ralliement", order: 0 },
      { key: "march", label: "Marche", order: 1 },
      { key: "engagement", label: "Engagement", order: 2 },
      { key: "wrap", label: "Synthèse", order: 3 },
    ],
    logic: {
      summary: "Placeholder — vagues et relais (futur).",
      resolver: "mobilization_wave",
    },
    structure: {
      legions: true,
      sides: false,
      buildings: false,
    },
  },
} as const satisfies Record<string, EventTypeDefinition>;

export type EventIntelligenceKey = keyof typeof eventTypes;

export function getEventTypeDefinition(
  key: string | null | undefined,
): EventTypeDefinition {
  if (key && key in eventTypes) {
    return eventTypes[key as EventIntelligenceKey];
  }
  return eventTypes.swordland;
}

/** Mappe les ids wizard (presets) vers les clés intelligence. */
export function wizardPresetIdToIntelligenceKey(
  presetId: string,
): EventIntelligenceKey | null {
  const map: Record<string, EventIntelligenceKey> = {
    swordland_showdown: "swordland",
    kingdom_of_power: "kvk",
    alliance_mobilization: "mobilization",
  };
  return map[presetId] ?? null;
}
