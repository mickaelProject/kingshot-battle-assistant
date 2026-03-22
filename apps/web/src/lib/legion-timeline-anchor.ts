import type { TimelineScope } from "@/lib/timeline-scope";

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
 * Offset phase (secondes depuis le T+0 **de la légion**) → secondes depuis le T+0 **alliance**
 * (référence commune aux annonces Discord).
 */
export function allianceClockOffsetSeconds(
  phaseOffsetSeconds: number,
  scope: TimelineScope,
  t: LegionAnchorTemplate,
): number {
  return legionAnchorOffsetMinutes(scope, t) * 60 + phaseOffsetSeconds;
}
