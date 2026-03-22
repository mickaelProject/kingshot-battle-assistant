/** Mirror bot embed accents for admin preview (Discord.js hex → CSS). */
export const TACTICAL_PHASE_UI: Record<
  string,
  { color: string; ribbon: string; label: string }
> = {
  START: { color: "#2dd4bf", ribbon: "▶", label: "START" },
  OBJECTIVE: { color: "#60a5fa", ribbon: "◎", label: "OBJECTIVE" },
  REMINDER: { color: "#fbbf24", ribbon: "⏱", label: "REMINDER" },
  FINAL: { color: "#f87171", ribbon: "⏳", label: "FINAL" },
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
