/**
 * Which template id to load for /battle start (override beats guild default).
 */
export type TemplateStartPick =
  | { source: "override"; templateName: string }
  | { source: "default" }
  | { source: "none" };

export function pickTemplateForBattleStart(
  overrideName: string | null,
  hasDefaultTemplate: boolean,
): TemplateStartPick {
  const trimmed = overrideName?.trim();
  if (trimmed) return { source: "override", templateName: trimmed };
  if (hasDefaultTemplate) return { source: "default" };
  return { source: "none" };
}
