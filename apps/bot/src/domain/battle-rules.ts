/**
 * Pure helpers for battle template timelines (unit-tested, no Prisma).
 */

import type { BattlePhaseType, TimelineScope } from "@prisma/client";

export type LegionAnchorTemplate = {
  legion1StartOffsetMinutes: number;
  legion2StartOffsetMinutes: number;
};

/** Minutes entre le T+0 alliance et le T+0 de la timeline de cette portée. */
export function legionAnchorOffsetMinutes(
  scope: TimelineScope,
  t: LegionAnchorTemplate,
): number {
  if (scope === "LEGION_1") return Math.max(0, t.legion1StartOffsetMinutes);
  if (scope === "LEGION_2") return Math.max(0, t.legion2StartOffsetMinutes);
  return 0;
}

/**
 * Offset phase (secondes depuis le T+0 de la légion) → secondes depuis le T+0 alliance
 * (référence commune pour l’horloge des annonces Discord).
 */
export function allianceClockOffsetSeconds(
  phaseOffsetSeconds: number,
  scope: TimelineScope,
  t: LegionAnchorTemplate,
): number {
  return legionAnchorOffsetMinutes(scope, t) * 60 + phaseOffsetSeconds;
}

const DISCORD_TIMELINE_SCOPES: TimelineScope[] = [
  "GLOBAL",
  "LEGION_1",
  "LEGION_2",
];

export function isDiscordTimelineScope(scope: TimelineScope): boolean {
  return DISCORD_TIMELINE_SCOPES.includes(scope);
}

export function legionPhaseTitlePrefix(scope: TimelineScope): string {
  if (scope === "LEGION_1") return "Légion 1 · ";
  if (scope === "LEGION_2") return "Légion 2 · ";
  return "";
}

export interface OffsetEvent {
  offsetSeconds: number;
  orderIndex?: number;
}

/** Sort by T+ offset ascending; tie-break by creation order (orderIndex). */
export function sortTemplateEventsByOffset<T extends OffsetEvent>(events: T[]): T[] {
  return [...events].sort((a, b) => {
    if (a.offsetSeconds !== b.offsetSeconds) {
      return a.offsetSeconds - b.offsetSeconds;
    }
    return (a.orderIndex ?? 0) - (b.orderIndex ?? 0);
  });
}

export function assertIntegerNonNegativeOffsets(
  events: { offsetSeconds: number }[],
): void {
  for (const e of events) {
    if (!Number.isInteger(e.offsetSeconds) || e.offsetSeconds < 0) {
      throw new Error("INVALID_EVENT_OFFSET");
    }
  }
}

/** Every phase must have a short headline (Discord embed title). */
export function assertPhaseHasDisplayableContent(
  events: { title: string }[],
): void {
  for (const e of events) {
    if (!e.title.trim()) {
      throw new Error("INVALID_PHASE_BODY");
    }
  }
}

export function reminderRowCountFromEvents(eventCount: number): number {
  return eventCount;
}

/** Validates offsets + phase body, returns events sorted by T+. */
export function prepareTemplateEventsForSession<
  T extends {
    id: string;
    offsetSeconds: number;
    orderIndex?: number;
    phaseType: BattlePhaseType;
    title: string;
    objective?: string;
    action?: string;
    nextHint?: string;
  },
>(events: T[]): T[] {
  assertIntegerNonNegativeOffsets(events);
  assertPhaseHasDisplayableContent(events);
  return sortTemplateEventsByOffset(events);
}
