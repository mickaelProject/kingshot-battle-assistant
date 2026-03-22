/** Phase row for template editor (matches Prisma `BattleEventDefinition` fields used in UI). */
export type EditorPhase = {
  id: string;
  offsetSeconds: number;
  phaseType: string;
  key: string;
  title: string;
  objective: string;
  action: string;
  nextHint: string;
};
