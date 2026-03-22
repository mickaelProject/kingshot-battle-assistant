/** Aligné sur l’enum Prisma `TimelineScope` (évite une dépendance au client non régénéré). */
export type TimelineScope = "GLOBAL" | "LEGION_1" | "LEGION_2";

export const TIMELINE_SCOPES: TimelineScope[] = [
  "GLOBAL",
  "LEGION_1",
  "LEGION_2",
];

export function isTimelineScope(raw: string): raw is TimelineScope {
  return (TIMELINE_SCOPES as string[]).includes(raw);
}
