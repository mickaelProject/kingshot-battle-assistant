import type { BattlePhaseType } from "@prisma/client";

export const phaseStyles = {
  START: { color: "#22c55e", label: "LANCEMENT", icon: "▶" },
  OBJECTIVE: { color: "#3b82f6", label: "OBJECTIF", icon: "◎" },
  REMINDER: { color: "#f59e0b", label: "RAPPEL", icon: "◷" },
  FINAL: { color: "#ef4444", label: "CLÔTURE", icon: "■" },
} as const satisfies Record<
  BattlePhaseType,
  { color: string; label: string; icon: string }
>;

export type PhaseStyleKey = keyof typeof phaseStyles;

export function getPhaseStyle(phaseType: string) {
  const k = phaseType as PhaseStyleKey;
  return phaseStyles[k] ?? phaseStyles.REMINDER;
}
