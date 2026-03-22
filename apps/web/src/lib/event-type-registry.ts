/**
 * Registre produit des types d’événement — extensible sans schéma Prisma dédié.
 * Seul Swordland a aujourd’hui la génération tactique roster complète.
 */

export type EventPresetSupport = "full" | "partial" | "coming_soon";

export type EventTypePreset = {
  id: string;
  label: string;
  shortLabel: string;
  icon: string;
  /** Accent UI (bordure / halo cartes) */
  color: string;
  support: EventPresetSupport;
  /** Arc tactique backend quand support === full */
  battleArchetype: "SWORDLAND" | "CASTLE_SIEGE" | "FORTRESS" | "PVP";
  /** Message court sous la carte */
  hint: string;
};

export const EVENT_TYPE_PRESETS: EventTypePreset[] = [
  {
    id: "swordland_showdown",
    label: "Swordland Showdown",
    shortLabel: "Swordland",
    icon: "🗡",
    color: "#3b82f6",
    support: "full",
    battleArchetype: "SWORDLAND",
    hint: "ORBAT 2 légions, bâtiments, timeline 7 phases.",
  },
  {
    id: "alliance_mobilization",
    label: "Alliance Mobilization",
    shortLabel: "Mobilisation",
    icon: "📣",
    color: "#8b5cf6",
    support: "coming_soon",
    battleArchetype: "SWORDLAND",
    hint: "Preset réservé — bientôt.",
  },
  {
    id: "sanctuary_battles",
    label: "Sanctuary Battles",
    shortLabel: "Sanctuary",
    icon: "⛪",
    color: "#a78bfa",
    support: "coming_soon",
    battleArchetype: "SWORDLAND",
    hint: "Preset réservé — bientôt.",
  },
  {
    id: "viking_vengeance",
    label: "Viking Vengeance",
    shortLabel: "Viking",
    icon: "🛶",
    color: "#0ea5e9",
    support: "coming_soon",
    battleArchetype: "PVP",
    hint: "Preset réservé — bientôt.",
  },
  {
    id: "cesares_fury",
    label: "Cesares Fury",
    shortLabel: "Cesares",
    icon: "⚔",
    color: "#dc2626",
    support: "coming_soon",
    battleArchetype: "CASTLE_SIEGE",
    hint: "Preset réservé — bientôt.",
  },
  {
    id: "pitfall_bear_hunt",
    label: "Pitfall / Bear Hunt",
    shortLabel: "Pitfall",
    icon: "🐻",
    color: "#b45309",
    support: "coming_soon",
    battleArchetype: "PVP",
    hint: "Preset réservé — bientôt.",
  },
  {
    id: "alliance_championship",
    label: "Alliance Championship",
    shortLabel: "Championship",
    icon: "🏆",
    color: "#eab308",
    support: "coming_soon",
    battleArchetype: "PVP",
    hint: "Preset réservé — bientôt.",
  },
  {
    id: "all_out_kill",
    label: "All Out (Kill Event)",
    shortLabel: "All Out",
    icon: "💀",
    color: "#f43f5e",
    support: "coming_soon",
    battleArchetype: "PVP",
    hint: "Preset réservé — bientôt.",
  },
  {
    id: "hero_roulette",
    label: "Hero Roulette",
    shortLabel: "Roulette",
    icon: "🎲",
    color: "#d946ef",
    support: "coming_soon",
    battleArchetype: "PVP",
    hint: "Preset réservé — bientôt.",
  },
  {
    id: "kingdom_of_power",
    label: "Kingdom of Power",
    shortLabel: "KoP",
    icon: "👑",
    color: "#f59e0b",
    support: "coming_soon",
    battleArchetype: "CASTLE_SIEGE",
    hint: "Preset réservé — bientôt.",
  },
  {
    id: "strongest_governor",
    label: "Strongest Governor",
    shortLabel: "SG",
    icon: "🎖",
    color: "#14b8a6",
    support: "coming_soon",
    battleArchetype: "PVP",
    hint: "Preset réservé — bientôt.",
  },
  {
    id: "rebel_invasion",
    label: "Rebel Invasion",
    shortLabel: "Rebelles",
    icon: "🔥",
    color: "#ef4444",
    support: "coming_soon",
    battleArchetype: "FORTRESS",
    hint: "Preset réservé — bientôt.",
  },
];

export function getEventPresetById(
  id: string,
): EventTypePreset | undefined {
  return EVENT_TYPE_PRESETS.find((p) => p.id === id);
}

export function presetAllowsWizardFlow(p: EventTypePreset): boolean {
  return p.support === "full";
}
