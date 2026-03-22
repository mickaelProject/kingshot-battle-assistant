/**
 * Plan d’affichage tactique (Swordland & futurs arcs) — pas de colonnes Prisma.
 * Buckets : 10 % leaders, 40 % défenseurs, 50 % mobile (par côté Ouest/Est, par légion).
 */

import { parseRosterLines } from "@/lib/roster-template/parse-roster";
import type { GeneratedRosterPhase } from "@/lib/roster-template/types";
import type { RosterPlayer } from "@/lib/roster-template/types";

export type BattleArchetype =
  | "SWORDLAND"
  | "CASTLE_SIEGE"
  | "FORTRESS"
  | "PVP";

export const BATTLE_ARCHETYPE_OPTIONS: {
  value: BattleArchetype;
  label: string;
  hint: string;
}[] = [
  {
    value: "SWORDLAND",
    label: "Swordland Showdown",
    hint: "ORBAT complet, bâtiments, timeline enrichie.",
  },
  {
    value: "CASTLE_SIEGE",
    label: "Siège de château",
    hint: "Prévu — génération générique pour l’instant.",
  },
  {
    value: "FORTRESS",
    label: "Forteresse",
    hint: "Prévu — génération générique pour l’instant.",
  },
  { value: "PVP", label: "PvP ouvert", hint: "Prévu — génération générique." },
];

const LEGION_HEADER = /^===\s*LEGION\s*(\d+)\s*===\s*$/i;

/** Séparateur interne — plus affiché dans l’UI roster (2 champs distincts). */
export const LEGION2_MERGE_MARKER = "\n=== LEGION 2 ===\n";

/** Fusionne Légion 1 + Légion 2 pour le parseur existant. */
export function combineLegionRosterFields(
  legion1: string,
  legion2: string,
): string {
  const a = legion1.replace(/\r\n/g, "\n").trimEnd();
  const b = legion2.replace(/\r\n/g, "\n").trim();
  if (!b) return a;
  return `${a}${LEGION2_MERGE_MARKER}${b}`;
}

const LEGION_EMOJI = ["🟥", "🟦", "🟩", "🟨", "🟪"] as const;

export type ParsedLegion = {
  index: number;
  rawLines: string[];
  players: RosterPlayer[];
};

/** Découpe le roster par blocs `=== LEGION 1 ===` (sinon une seule légion). */
export function parseRosterLegions(raw: string): ParsedLegion[] {
  const lines = raw.split(/\r?\n/);
  let legionNum = 1;
  const buckets = new Map<number, string[]>();

  const push = (leg: number, line: string) => {
    if (!buckets.has(leg)) buckets.set(leg, []);
    buckets.get(leg)!.push(line);
  };

  for (const line of lines) {
    const t = line.trim();
    const m = t.match(LEGION_HEADER);
    if (m) {
      legionNum = Math.max(1, parseInt(m[1]!, 10));
      continue;
    }
    push(legionNum, line);
  }

  const keys = [...buckets.keys()].sort((a, b) => a - b);
  const legions: ParsedLegion[] = [];
  for (const k of keys) {
    const chunk = buckets.get(k)!.join("\n");
    const players = parseRosterLines(chunk);
    if (players.length === 0) continue;
    legions.push({ index: k, rawLines: buckets.get(k)!, players });
  }

  if (legions.length === 0) {
    const all = parseRosterLines(raw);
    if (all.length > 0) {
      legions.push({ index: 1, rawLines: lines, players: all });
    }
  }

  return legions;
}

/** Toujours au moins une légion si le roster brut contient des joueurs. */
export function ensureParsedLegions(raw: string): ParsedLegion[] {
  const L = parseRosterLegions(raw);
  if (L.length > 0) return L;
  const p = parseRosterLines(raw);
  if (p.length === 0) return [];
  return [{ index: 1, rawLines: [], players: p }];
}

export function mergeLegionPlayersUnique(legions: ParsedLegion[]): RosterPlayer[] {
  const best = new Map<string, RosterPlayer>();
  for (const L of legions) {
    for (const p of L.players) {
      const key = p.name.toUpperCase();
      const prev = best.get(key);
      if (!prev || p.power > prev.power) best.set(key, p);
    }
  }
  return [...best.values()].sort((a, b) => b.power - a.power);
}

export type RosterBucket104050 = {
  leaders: RosterPlayer[];
  defenders: RosterPlayer[];
  mobile: RosterPlayer[];
};

/** Top 10 % leaders (min 1), 40 % défenseurs, reste mobile — sur liste déjà triée puissance ↓ */
export function bucketPlayers104050(players: RosterPlayer[]): RosterBucket104050 {
  const n = players.length;
  if (n === 0) return { leaders: [], defenders: [], mobile: [] };
  const nL = Math.max(1, Math.ceil(n * 0.1));
  const nD = Math.floor(n * 0.4);
  return {
    leaders: players.slice(0, nL),
    defenders: players.slice(nL, nL + nD),
    mobile: players.slice(nL + nD),
  };
}

function splitWestEast(players: RosterPlayer[]): {
  west: RosterPlayer[];
  east: RosterPlayer[];
} {
  const west: RosterPlayer[] = [];
  const east: RosterPlayer[] = [];
  players.forEach((p, i) => {
    (i % 2 === 0 ? west : east).push(p);
  });
  return { west, east };
}

export type BuildingDef = {
  id: string;
  name: string;
  side: "WEST" | "EAST";
};

export const SWORDLAND_BUILDINGS: BuildingDef[] = [
  { id: "bell", name: "Bell Tower", side: "WEST" },
  { id: "sanctum1", name: "Sanctum 1", side: "WEST" },
  { id: "sanctum2", name: "Sanctum 2", side: "WEST" },
  { id: "abbey1", name: "Abbey 1", side: "WEST" },
  { id: "abbey2", name: "Abbey 2", side: "WEST" },
  { id: "abbey3", name: "Abbey 3", side: "EAST" },
  { id: "abbey4", name: "Abbey 4", side: "EAST" },
  { id: "stables", name: "Royal Stables", side: "EAST" },
  { id: "hall", name: "Hall of Reformation", side: "EAST" },
  { id: "merc", name: "Mercenary Camp", side: "EAST" },
  { id: "sword", name: "Swordshrines", side: "EAST" },
];

export type BuildingAssignment = {
  id: string;
  name: string;
  side: "WEST" | "EAST";
  leader: RosterPlayer | null;
  players: RosterPlayer[];
};

function assignBuildingsForSide(
  sideBuildings: BuildingDef[],
  buckets: RosterBucket104050,
): BuildingAssignment[] {
  const { leaders, defenders, mobile } = buckets;
  const followers = [...defenders, ...mobile];
  const chunks: RosterPlayer[][] = sideBuildings.map(() => []);
  followers.forEach((p, i) => {
    chunks[i % Math.max(1, chunks.length)]!.push(p);
  });
  return sideBuildings.map((b, i) => {
    const lead =
      leaders[i % Math.max(1, leaders.length)] ??
      followers[0] ??
      null;
    return {
      id: b.id,
      name: b.name,
      side: b.side,
      leader: lead,
      players: chunks[i] ?? [],
    };
  });
}

export type LegionTacticalPlan = {
  index: number;
  emoji: string;
  label: string;
  playerCount: number;
  totalPower: number;
  west: RosterBucket104050;
  east: RosterBucket104050;
  buildings: BuildingAssignment[];
};

function buildLegionPlanSwordland(
  legion: ParsedLegion,
  seq: number,
): LegionTacticalPlan {
  const sorted = [...legion.players].sort((a, b) => b.power - a.power);
  const { west: wP, east: eP } = splitWestEast(sorted);
  const west = bucketPlayers104050(wP);
  const east = bucketPlayers104050(eP);
  const westB = SWORDLAND_BUILDINGS.filter((b) => b.side === "WEST");
  const eastB = SWORDLAND_BUILDINGS.filter((b) => b.side === "EAST");
  const buildings = [
    ...assignBuildingsForSide(westB, west),
    ...assignBuildingsForSide(eastB, east),
  ];
  const totalPower = sorted.reduce((s, p) => s + p.power, 0);
  const emoji = LEGION_EMOJI[seq % LEGION_EMOJI.length] ?? "⬛";
  return {
    index: legion.index,
    emoji,
    label: `LEGION ${legion.index}`,
    playerCount: sorted.length,
    totalPower,
    west,
    east,
    buildings,
  };
}

function buildLegionPlanGeneric(
  legion: ParsedLegion,
  seq: number,
): LegionTacticalPlan {
  const sorted = [...legion.players].sort((a, b) => b.power - a.power);
  const { west: wP, east: eP } = splitWestEast(sorted);
  const west = bucketPlayers104050(wP);
  const east = bucketPlayers104050(eP);
  const totalPower = sorted.reduce((s, p) => s + p.power, 0);
  const emoji = LEGION_EMOJI[seq % LEGION_EMOJI.length] ?? "⬛";
  return {
    index: legion.index,
    emoji,
    label: `LEGION ${legion.index}`,
    playerCount: sorted.length,
    totalPower,
    west,
    east,
    buildings: [],
  };
}

function buildLegionTacticalPlan(
  legion: ParsedLegion,
  seq: number,
  archetype: BattleArchetype,
): LegionTacticalPlan {
  return archetype === "SWORDLAND"
    ? buildLegionPlanSwordland(legion, seq)
    : buildLegionPlanGeneric(legion, seq);
}

export type PhaseTacticalOverlay = {
  orderIndex: number;
  headline: string;
  objectiveShort: string;
  actionShort: string;
  leadersInvolved: string[];
  westRows: { building: string; leader: string; players: string }[];
  eastRows: { building: string; leader: string; players: string }[];
  /** Fusionné à l’enregistrement dans `objective` pour Discord. */
  markdownAppendix: string;
};

export const SWORDLAND_PHASE_FOCUS: string[][] = [
  [
    "bell",
    "sanctum1",
    "sanctum2",
    "abbey1",
    "abbey2",
    "abbey3",
    "abbey4",
  ],
  [
    "bell",
    "sanctum1",
    "sanctum2",
    "abbey1",
    "abbey2",
    "abbey3",
    "abbey4",
    "stables",
    "merc",
    "sword",
  ],
  ["sword", "merc", "hall", "stables", "bell", "sanctum1", "sanctum2"],
  [
    "bell",
    "sanctum1",
    "sanctum2",
    "abbey1",
    "abbey2",
    "abbey3",
    "abbey4",
    "merc",
    "sword",
  ],
  ["merc", "sword", "hall", "stables", "abbey3", "abbey4"],
  [
    "bell",
    "sanctum1",
    "sanctum2",
    "abbey1",
    "abbey2",
    "abbey3",
    "abbey4",
  ],
  [
    "sword",
    "merc",
    "hall",
    "stables",
    "bell",
    "sanctum1",
    "sanctum2",
    "abbey1",
    "abbey2",
    "abbey3",
    "abbey4",
  ],
];

const SWORDLAND_PHASE_HEADLINE: string[] = [
  "Prise des bâtiments — déploiement",
  "Stabilisation — tenir les flags",
  "Rotation — Swordshrines / Mercenaire / Hall",
  "Renforts avant rallies",
  "Préparation poussée finale",
  "Rappel — fenêtre ville",
  "All-in — max points",
];

function rowFromAssignment(
  a: BuildingAssignment,
): { building: string; leader: string; players: string } {
  const leader = a.leader?.name ?? "—";
  const pl =
    a.players.length > 0
      ? a.players.map((p) => p.name).join(", ")
      : "—";
  return { building: a.name, leader, players: pl };
}

function collectRowsForFocus(
  legions: LegionTacticalPlan[],
  focus: Set<string>,
): {
  westRows: { building: string; leader: string; players: string }[];
  eastRows: { building: string; leader: string; players: string }[];
  leaders: Set<string>;
} {
  const westRows: { building: string; leader: string; players: string }[] = [];
  const eastRows: { building: string; leader: string; players: string }[] = [];
  const leaders = new Set<string>();
  for (const L of legions) {
    for (const b of L.buildings) {
      if (!focus.has(b.id)) continue;
      const row = rowFromAssignment(b);
      if (b.leader?.name) leaders.add(b.leader.name);
      const tag =
        legions.length > 1 ? `${L.emoji} ${row.building}` : row.building;
      const r = { ...row, building: tag };
      if (b.side === "WEST") westRows.push(r);
      else eastRows.push(r);
    }
  }
  return { westRows, eastRows, leaders };
}

function formatAppendix(
  headline: string,
  leaders: string[],
  westRows: { building: string; leader: string; players: string }[],
  eastRows: { building: string; leader: string; players: string }[],
): string {
  const lines: string[] = [
    "",
    "━━ ORBAT (auto) ━━",
    `🎯 ${headline}`,
    leaders.length ? `👥 Leaders : ${leaders.join(", ")}` : "",
    "",
    "WEST",
  ];
  for (const r of westRows) {
    lines.push(`• ${r.building} → RL ${r.leader} — ${r.players}`);
  }
  lines.push("", "EAST");
  for (const r of eastRows) {
    lines.push(`• ${r.building} → RL ${r.leader} — ${r.players}`);
  }
  return lines.filter(Boolean).join("\n");
}

export function buildSwordlandPhaseOverlays(
  phaseCount: number,
  legions: LegionTacticalPlan[],
): PhaseTacticalOverlay[] {
  const out: PhaseTacticalOverlay[] = [];
  for (let i = 0; i < phaseCount; i++) {
    const focusIds =
      SWORDLAND_PHASE_FOCUS[i] ??
      SWORDLAND_PHASE_FOCUS[SWORDLAND_PHASE_FOCUS.length - 1]!;
    const focus = new Set(focusIds);
    const { westRows, eastRows, leaders } = collectRowsForFocus(
      legions,
      focus,
    );
    const headline =
      SWORDLAND_PHASE_HEADLINE[i] ??
      SWORDLAND_PHASE_HEADLINE[SWORDLAND_PHASE_HEADLINE.length - 1] ??
      `Phase ${i + 1}`;
    const leadersInvolved = [...leaders].slice(0, 12);
    out.push({
      orderIndex: i,
      headline,
      objectiveShort: headline,
      actionShort: "Suivre le vocal RL — pas de split sans ordre.",
      leadersInvolved,
      westRows,
      eastRows,
      markdownAppendix: formatAppendix(
        headline,
        leadersInvolved,
        westRows,
        eastRows,
      ),
    });
  }
  return out;
}

export type TacticalWarPlan = {
  archetype: BattleArchetype;
  legions: LegionTacticalPlan[];
  phaseOverlays: PhaseTacticalOverlay[];
};

export function buildFullTacticalWarPlan(
  archetype: BattleArchetype,
  parsedLegions: ParsedLegion[],
  phaseCount: number,
): TacticalWarPlan {
  const legions = parsedLegions.map((L, i) =>
    buildLegionTacticalPlan(L, i, archetype),
  );
  const phaseOverlays =
    archetype === "SWORDLAND" && phaseCount > 0
      ? buildSwordlandPhaseOverlays(phaseCount, legions)
      : [];
  return { archetype, legions, phaseOverlays };
}

/** Applique l’ORBAT textuel aux phases (à l’enregistrement). */
export function mergeTacticalAppendixIntoPhases(
  phases: GeneratedRosterPhase[],
  overlays: PhaseTacticalOverlay[],
): GeneratedRosterPhase[] {
  if (overlays.length === 0) return phases;
  const byIdx = new Map(overlays.map((o) => [o.orderIndex, o]));
  return phases.map((p) => {
    const o = byIdx.get(p.orderIndex);
    if (!o?.markdownAppendix) return p;
    return {
      ...p,
      objective: `${p.objective.trim()}${o.markdownAppendix}`,
    };
  });
}

export function formatLegionPowerLine(total: number): string {
  if (total >= 1_000_000) return `${(total / 1_000_000).toFixed(1)}M`;
  if (total >= 1_000) return `${(total / 1_000).toFixed(1)}k`;
  return String(total);
}
