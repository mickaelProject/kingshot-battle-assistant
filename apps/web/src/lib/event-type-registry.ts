/**
 * Presets wizard ↔ actions serveur — alignés sur `lib/events/event-registry.ts`.
 * L’id Prisma / formulaire reste `swordland_showdown` pour Swordland (compat).
 */

import {
  EVENT_TYPE_KEYS,
  EVENTS,
  eventTypeToServerPresetId,
  type EventType,
} from "@/lib/events/event-registry";

export type EventPresetSupport = "full" | "partial" | "coming_soon";

export type EventTypePreset = {
  /** Id envoyé au serveur (actions roster). */
  id: string;
  eventType: EventType;
  label: string;
  shortLabel: string;
  icon: string;
  color: string;
  support: EventPresetSupport;
  battleArchetype: "SWORDLAND" | "CASTLE_SIEGE" | "FORTRESS" | "PVP";
  hint: string;
  duration: number;
  timingMode: "real_time" | "async";
};

function shortLabelFromName(name: string): string {
  const part = name.split("—")[0]?.trim();
  return part && part.length <= 24 ? part : name.slice(0, 22);
}

export const EVENT_TYPE_PRESETS: EventTypePreset[] = EVENT_TYPE_KEYS.map(
  (key) => {
    const e = EVENTS[key];
    const gr = e.generationRules;
    const hint =
      e.description.length > 140
        ? `${e.description.slice(0, 137)}…`
        : e.description;
    return {
      id: eventTypeToServerPresetId(key),
      eventType: key,
      label: e.name,
      shortLabel: shortLabelFromName(e.name),
      icon: gr.icon,
      color: gr.color,
      support: "full",
      battleArchetype: gr.battleArchetype,
      hint,
      duration: e.duration,
      timingMode: e.type,
    };
  },
);

export function getEventPresetById(id: string): EventTypePreset | undefined {
  return EVENT_TYPE_PRESETS.find((p) => p.id === id);
}

export function presetAllowsWizardFlow(p: EventTypePreset): boolean {
  return p.support === "full";
}

export function presetIdToEventType(presetId: string): EventType | null {
  const p = getEventPresetById(presetId);
  return p?.eventType ?? null;
}
