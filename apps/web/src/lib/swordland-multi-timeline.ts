/**
 * Génération Swordland : timeline GLOBAL (annonces alliance) + 1 timeline par légion (ORBAT dédié).
 * Le bot Discord ne publie que les phases GLOBAL.
 */

import type { BattlePhaseType } from "@prisma/client";
import type { TimelineScope } from "@/lib/timeline-scope";
import { computeRosterGroups, scaleSwordlandOffsetSeconds } from "@/lib/roster-generation.service";
import type { GeneratedRosterPhase } from "@/lib/roster-template/types";
import type { RosterPlayer } from "@/lib/roster-template/types";
import {
  buildSwordlandPhaseOverlays,
  mergeLegionPlayersUnique,
  SWORDLAND_BUILDINGS,
  SWORDLAND_PHASE_FOCUS,
  type ParsedLegion,
  type TacticalWarPlan,
} from "@/lib/tactical-war-plan";

function randomKeySuffix(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID().replace(/-/g, "").slice(0, 10);
  }
  return String(Math.random()).slice(2, 12);
}

function buildingNamesForFocus(focusIds: string[]): string[] {
  const set = new Set(focusIds);
  return SWORDLAND_BUILDINGS.filter((b) => set.has(b.id)).map((b) => b.name);
}

function playersFromOverlayRows(
  west: { players: string }[],
  east: { players: string }[],
): string[] {
  const out = new Set<string>();
  const ingest = (s: string) => {
    for (const part of s.split(",")) {
      const n = part.trim();
      if (n && n !== "—") out.add(n);
    }
  };
  for (const r of west) ingest(r.players);
  for (const r of east) ingest(r.players);
  return [...out].slice(0, 40);
}

export type GeneratedSwordlandPhase = GeneratedRosterPhase & {
  timelineScope: TimelineScope;
  targetedBuildings: string[];
  assignedLeaders: string[];
  assignedPlayers: string[];
  generatedDiscordDraft: string;
};

export function composeDiscordDraftFromPhase(p: {
  title: string;
  objective: string;
  action: string;
  nextHint: string;
}): string {
  const lines: string[] = [`▶ ${p.title.trim()}`];
  const o = p.objective.trim();
  const a = p.action.trim();
  const n = p.nextHint.trim();
  if (o) lines.push("", "🎯 Objectif", o);
  if (a) lines.push("", "⚡ Action", a);
  if (n) lines.push("", "⏭️ Prochain pas", n);
  return lines.join("\n");
}

type RowDef = {
  phaseType: BattlePhaseType;
  title: string;
  objective: string;
  action: string;
  nextHint: string;
};

const SWORDLAND_STRATEGIC_ROWS: RowDef[] = [
  {
    phaseType: "START",
    title: "Swordland — déploiement initial",
    objective:
      "Début de bataille : prise rapide des bâtiments stratégiques (contrôle carte > kills).",
    action:
      "Split propre : pas de fight inutile — un call vocal, priorités claires sur les flags.",
    nextHint: "Stabiliser avant la fenêtre de rotation (~15 min).",
  },
  {
    phaseType: "OBJECTIVE",
    title: "Stabilisation du contrôle",
    objective:
      "Tenir tous les bâtiments capturés : défense continue, zéro rotation gratuite.",
    action:
      "Noyau sur les points clés, mobile sur les lignes de vue / retards ennemis.",
    nextHint: "Préparer la rotation Swordshrines / mercenaire / Hall.",
  },
  {
    phaseType: "OBJECTIVE",
    title: "Rotation — objectifs dynamiques",
    objective:
      "Swordshrines, camp mercenaire, Hall of Reformation : priorité absolue sur le Hall si contest.",
    action:
      "Ouest / Est synchronisés — ne pas abandonner les bâtiments moteurs de points.",
    nextHint: "Renforcer avant toute relance de rallies massifs.",
  },
  {
    phaseType: "REMINDER",
    title: "Renforts & respir",
    objective:
      "Check stocks, blessés, positions : renfort ciblé avant les grosses poussées.",
    action: "Leader valide les swaps — mobile couvre les flancs courts.",
    nextHint: "Enclencher la préparation de poussée finale au prochain repère.",
  },
  {
    phaseType: "OBJECTIVE",
    title: "Préparation — poussée finale",
    objective:
      "Alignement des timers, focus unique RL, cartographie des derniers objectifs.",
    action:
      "Pas d’overextension : on consolide l’avantage carte avant d’ouvrir le tempo.",
    nextHint:
      "Dernière ligne droite : respecter la fenêtre ville (10 dernières minutes).",
  },
  {
    phaseType: "REMINDER",
    title: "Rappel — villes",
    objective:
      "Pas d’attaque de ville avant les 10 dernières minutes sauf ordre RL explicite.",
    action: "Priorité aux points structurels et au deny ennemi.",
    nextHint: "All-in final au signal RL.",
  },
  {
    phaseType: "FINAL",
    title: "Poussée totale — maximiser les points",
    objective:
      "Fin de créneau : tout le monde sur le plan de jeu validé par les RL.",
    action:
      "Tempo max, un seul shotcaller — mobile en soutien / contest des retards.",
    nextHint: "Fin des annonces tactiques — debrief rapide au vocal.",
  },
];

function prismaScopeForLegionIndex(idx: number): TimelineScope {
  if (idx <= 1) return "LEGION_1";
  return "LEGION_2";
}

/**
 * Produit les phases GLOBAL + une série par légion (même grille T+, contenu ORBAT par légion).
 */
export function buildSwordlandMultiTimelinePhases(input: {
  eventDurationMinutes: number;
  notes: string;
  tacticalPlan: TacticalWarPlan;
  parsedLegions: ParsedLegion[];
}): GeneratedSwordlandPhase[] {
  const { eventDurationMinutes, notes, tacticalPlan, parsedLegions } = input;
  const notesBlock = notes.trim() ? `\n\nNotes officiers : ${notes.trim()}` : "";
  const offsets = scaleSwordlandOffsetSeconds(eventDurationMinutes);
  const n = SWORDLAND_STRATEGIC_ROWS.length;
  if (offsets.length !== n) {
    throw new Error("[swordland-multi] Offset count mismatch.");
  }

  const mergedPlayers = mergeLegionPlayersUnique(parsedLegions);
  const groups = computeRosterGroups(mergedPlayers);
  const topAllianceLeaders = groups.topLeaders
    .slice(0, 5)
    .map((p) => p.name);

  const globalOverlays = tacticalPlan.phaseOverlays;

  const out: GeneratedSwordlandPhase[] = [];
  let orderIndex = 0;

  for (let i = 0; i < n; i++) {
    const row = SWORDLAND_STRATEGIC_ROWS[i]!;
    const off = offsets[i]!;
    const focusIds = SWORDLAND_PHASE_FOCUS[i] ?? SWORDLAND_PHASE_FOCUS[n - 1]!;
    const buildings = buildingNamesForFocus(focusIds);
    const go = globalOverlays[i];
    let baseObj = row.objective.trim();
    if (row.phaseType === "FINAL") {
      baseObj = baseObj.replace(
        "Fin de créneau :",
        `Fin de créneau (T+${eventDurationMinutes} min) :`,
      );
    }
    const objective = `${baseObj}${notesBlock}`;
    const leaders = go?.leadersInvolved?.length
      ? go.leadersInvolved.slice(0, 8)
      : topAllianceLeaders;
    const players = go
      ? playersFromOverlayRows(go.westRows, go.eastRows).slice(0, 40)
      : mergedPlayers.slice(0, 25).map((p) => p.name);

    const phase: GeneratedSwordlandPhase = {
      offsetSeconds: off,
      phaseType: row.phaseType,
      title: row.title,
      objective,
      action: row.action,
      nextHint: row.nextHint,
      orderIndex: orderIndex++,
      key: `sw-global-${i}-${randomKeySuffix()}`,
      timelineScope: "GLOBAL",
      targetedBuildings: buildings,
      assignedLeaders: leaders,
      assignedPlayers: players,
      generatedDiscordDraft: composeDiscordDraftFromPhase({
        title: row.title,
        objective,
        action: row.action,
        nextHint: row.nextHint,
      }),
    };
    out.push(phase);
  }

  for (const L of tacticalPlan.legions) {
    const scope = prismaScopeForLegionIndex(L.index);
    const overlays = buildSwordlandPhaseOverlays(n, [L]);
    for (let i = 0; i < n; i++) {
      const row = SWORDLAND_STRATEGIC_ROWS[i]!;
      const off = offsets[i]!;
      const o = overlays[i]!;
      const focusIds = SWORDLAND_PHASE_FOCUS[i] ?? SWORDLAND_PHASE_FOCUS[n - 1]!;
      const buildings = buildingNamesForFocus(focusIds);
      let baseObj = row.objective.trim();
      if (row.phaseType === "FINAL") {
        baseObj = baseObj.replace(
          "Fin de créneau :",
          `Fin de créneau (T+${eventDurationMinutes} min) :`,
        );
      }
      const objective = `${baseObj}${notesBlock}${o.markdownAppendix}`;
      const leaders = o.leadersInvolved.slice(0, 8);
      const players = playersFromOverlayRows(o.westRows, o.eastRows);

      out.push({
        offsetSeconds: off,
        phaseType: row.phaseType,
        title: `${L.emoji} ${L.label} — ${row.title}`,
        objective,
        action: row.action,
        nextHint: row.nextHint,
        orderIndex: orderIndex++,
        key: `sw-L${L.index}-${i}-${randomKeySuffix()}`,
        timelineScope: scope,
        targetedBuildings: buildings,
        assignedLeaders: leaders,
        assignedPlayers: players,
        generatedDiscordDraft: composeDiscordDraftFromPhase({
          title: `${L.label} — ${row.title}`,
          objective,
          action: row.action,
          nextHint: row.nextHint,
        }),
      });
    }
  }

  return out;
}

export function shouldUseSwordlandMultiLegionTimeline(
  swordlandShowdownPreset: boolean,
  parsedLegions: ParsedLegion[],
): boolean {
  return swordlandShowdownPreset && parsedLegions.length >= 1;
}
