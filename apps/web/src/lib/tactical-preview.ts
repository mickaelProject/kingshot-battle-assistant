/** Mirror bot embed accents for admin preview (Discord.js hex → CSS). */
export const TACTICAL_PHASE_UI: Record<
  string,
  { color: string; ribbon: string; label: string }
> = {
  START: { color: "#22c55e", ribbon: "▶", label: "START" },
  OBJECTIVE: { color: "#3b82f6", ribbon: "◎", label: "OBJECTIVE" },
  REMINDER: { color: "#fb923c", ribbon: "⏱", label: "REMINDER" },
  FINAL: { color: "#ef4444", ribbon: "⏳", label: "FINAL" },
};

export function tacticalPreviewTitle(
  title: string,
  objective?: string,
  action?: string,
): string {
  const t = title.trim();
  if (t) return t;
  if (objective?.trim()) return objective.trim();
  if (action?.trim()) return action.trim();
  return "Tactical update";
}
