/**
 * Registre central des événements Kingshot (UI + règles de génération roster).
 * Les ids serveur pour le formulaire Prisma / actions sont dérivés via
 * `eventTypeToServerPresetId` (Swordland garde `swordland_showdown` pour compat).
 */

export type EventType =
  | "swordland"
  | "kvk_preparation"
  | "kvk_war"
  | "sanctuary_battle"
  | "alliance_mobilization"
  | "flamedragon_tyrant"
  | "kingdom_transfer";

export type EventTimingMode = "real_time" | "async";

export type EventGenerationRules = {
  /** Phases Discord / timeline générées côté serveur (actions roster). */
  useServerTimeline: boolean;
  /** Afficher l’onglet carte tactique (Swordland uniquement). */
  showTacticalMap: boolean;
  /** L’assistant roster attend deux blocs (L1 / L2 ou équivalent). */
  dualRosterFields: boolean;
  /** Libellés pour les deux champs roster. */
  rosterGroupLabels: { a: string; b: string };
  /** Icône affichée dans le wizard. */
  icon: string;
  /** Couleur accent UI. */
  color: string;
  /** Arc Prisma / génération serveur (hors Swordland → phases génériques). */
  battleArchetype: "SWORDLAND" | "CASTLE_SIEGE" | "FORTRESS" | "PVP";
};

export type EventDefinition = {
  name: string;
  duration: number;
  type: EventTimingMode;
  hasLegions: boolean;
  hasBuildings: boolean;
  description: string;
  generationRules: EventGenerationRules;
};

export const EVENTS: Record<EventType, EventDefinition> = {
  swordland: {
    name: "Swordland Showdown",
    duration: 60,
    type: "real_time",
    hasLegions: true,
    hasBuildings: true,
    description:
      "Bataille structurée : deux légions, ORBAT bâtiments Ouest/Est, timeline 60 min et leaders auto.",
    generationRules: {
      useServerTimeline: true,
      showTacticalMap: true,
      dualRosterFields: true,
      rosterGroupLabels: { a: "Légion 1", b: "Légion 2" },
      icon: "🗡",
      color: "#3b82f6",
      battleArchetype: "SWORDLAND",
    },
  },
  kvk_preparation: {
    name: "KvK — Préparation",
    duration: 0,
    type: "async",
    hasLegions: false,
    hasBuildings: false,
    description:
      "Pas de timeline in-game : check-lists farming, ressources et préparation des troupes avant la guerre.",
    generationRules: {
      useServerTimeline: false,
      showTacticalMap: false,
      dualRosterFields: true,
      rosterGroupLabels: { a: "Groupe A", b: "Groupe B" },
      icon: "🛠",
      color: "#0ea5e9",
      battleArchetype: "CASTLE_SIEGE",
    },
  },
  kvk_war: {
    name: "KvK — Guerre",
    duration: 120,
    type: "real_time",
    hasLegions: true,
    hasBuildings: false,
    description:
      "Rôles rally leader, garnison et support — assignation des joueurs par rôle selon la puissance.",
    generationRules: {
      useServerTimeline: true,
      showTacticalMap: false,
      dualRosterFields: true,
      rosterGroupLabels: { a: "Escadre principale", b: "Réserve" },
      icon: "⚔",
      color: "#dc2626",
      battleArchetype: "CASTLE_SIEGE",
    },
  },
  sanctuary_battle: {
    name: "Sanctuary Battle",
    duration: 90,
    type: "real_time",
    hasLegions: false,
    hasBuildings: false,
    description:
      "Créneaux horaires, vagues attaque / défense et groupes rotatifs.",
    generationRules: {
      useServerTimeline: true,
      showTacticalMap: false,
      dualRosterFields: true,
      rosterGroupLabels: { a: "Créneau 1", b: "Créneau 2" },
      icon: "⛪",
      color: "#a78bfa",
      battleArchetype: "FORTRESS",
    },
  },
  alliance_mobilization: {
    name: "Alliance Mobilization",
    duration: 0,
    type: "async",
    hasLegions: false,
    hasBuildings: false,
    description:
      "Missions d’alliance avec quotas : répartition automatique des joueurs par mission.",
    generationRules: {
      useServerTimeline: false,
      showTacticalMap: false,
      dualRosterFields: false,
      rosterGroupLabels: { a: "Effectif", b: "Renforts" },
      icon: "📣",
      color: "#8b5cf6",
      battleArchetype: "PVP",
    },
  },
  flamedragon_tyrant: {
    name: "Flamedragon Tyrant",
    duration: 45,
    type: "real_time",
    hasLegions: false,
    hasBuildings: false,
    description:
      "Événement boss : groupes d’attaque et ordre de rotation des passes.",
    generationRules: {
      useServerTimeline: true,
      showTacticalMap: false,
      dualRosterFields: true,
      rosterGroupLabels: { a: "Vague A", b: "Vague B" },
      icon: "🐉",
      color: "#f97316",
      battleArchetype: "PVP",
    },
  },
  kingdom_transfer: {
    name: "Kingdom Transfer",
    duration: 0,
    type: "async",
    hasLegions: false,
    hasBuildings: false,
    description:
      "Organisation du transfert : groupes de migration et points de ralliement.",
    generationRules: {
      useServerTimeline: false,
      showTacticalMap: false,
      dualRosterFields: true,
      rosterGroupLabels: { a: "Convoi 1", b: "Convoi 2" },
      icon: "🧭",
      color: "#14b8a6",
      battleArchetype: "PVP",
    },
  },
};

export const EVENT_TYPE_KEYS: EventType[] = [
  "swordland",
  "kvk_preparation",
  "kvk_war",
  "sanctuary_battle",
  "alliance_mobilization",
  "flamedragon_tyrant",
  "kingdom_transfer",
];

export function eventTypeToServerPresetId(t: EventType): string {
  return t === "swordland" ? "swordland_showdown" : t;
}

export function serverPresetIdToEventType(presetId: string): EventType | null {
  if (presetId === "swordland_showdown") return "swordland";
  if (presetId in EVENTS) return presetId as EventType;
  return null;
}

/** Valeur stockée dans `BattleTemplate.eventProductKey` pour les nouveaux modèles. */
export function wizardPresetToEventProductKey(presetId: string): string {
  return serverPresetIdToEventType(presetId) ?? "swordland";
}

export function getEventDefinition(t: EventType): EventDefinition {
  return EVENTS[t];
}
