/**
 * Pure helpers for battle template timelines (unit-tested, no Prisma).
 */

import type { BattlePhaseType } from "@prisma/client";

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
