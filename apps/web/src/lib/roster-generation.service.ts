/**
 * Génération de brouillon de modèle depuis un roster (officiers non techniques).
 * Garantit une timeline d’annonces qui couvre toute la durée événement (dernière phase = fin).
 */

import type { BattlePhaseType } from "@prisma/client";
import { parseRosterLines } from "@/lib/roster-template/parse-roster";
import type {
  GeneratedRosterPhase,
  PlayStyle,
  RosterEventType,
  RosterGenerationInput,
  RosterPlayer,
} from "@/lib/roster-template/types";

export type { PlayStyle } from "@/lib/roster-template/types";

export type RosterGroups = {
  topLeaders: RosterPlayer[];
  mainGroup: RosterPlayer[];
  supportGroup: RosterPlayer[];
  mobileLowPower: RosterPlayer[];
};

export type RosterParsed = {
  players: RosterPlayer[];
  groups: RosterGroups;
};

const EVENT_COPY: Record<
  RosterEventType,
  { startTitle: string; midTitle: string; siegeHint?: string }
> = {
  GENERIC: { startTitle: "Mise en place", midTitle: "Exécution" },
  RALLY: { startTitle: "Ralliement & checks", midTitle: "Ordre de marche" },
  FIELD_BATTLE: {
    startTitle: "Déploiement sur le champ",
    midTitle: "Vagues & focus",
  },
  SIEGE: {
    startTitle: "Positionnement siège",
    midTitle: "Pression & objectifs",
    siegeHint: "Priorise les structures selon le call RL.",
  },
};

/** Modèles en minutes sur une échelle 0–60, puis mis à l’échelle sur la durée réelle. Dernière valeur toujours 60 → fin d’événement. */
const BASE_OFFSET_MINUTES: Record<number, readonly number[]> = {
  5: [0, 20, 40, 52, 60],
  6: [0, 15, 25, 35, 50, 60],
  7: [0, 12, 22, 32, 42, 52, 60],
  8: [0, 10, 18, 28, 38, 48, 55, 60],
};

function randomKeySuffix(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID().replace(/-/g, "").slice(0, 10);
  }
  return String(Math.random()).slice(2, 12);
}

export function fmtPowerShort(p: number): string {
  if (p >= 1_000_000) return `${(p / 1_000_000).toFixed(1)}M`;
  if (p >= 1_000) return `${(p / 1_000).toFixed(1)}k`;
  return String(p);
}

/** Top RL / shot-call (max 5). */
export function pickLeaderCandidates(
  players: RosterPlayer[],
  max = 5,
): RosterPlayer[] {
  if (players.length === 0) return [];
  const cap = Math.min(max, Math.max(1, Math.ceil(players.length * 0.12)));
  return players.slice(0, Math.min(cap, 5));
}

export function computeRosterGroups(players: RosterPlayer[]): RosterGroups {
  const n = players.length;
  if (n === 0) {
    return {
      topLeaders: [],
      mainGroup: [],
      supportGroup: [],
      mobileLowPower: [],
    };
  }
  const lEnd = Math.min(5, Math.max(1, Math.ceil(n * 0.15)));
  const topLeaders = players.slice(0, lEnd);
  const rest = players.slice(lEnd);
  if (rest.length === 0) {
    return { topLeaders, mainGroup: [], supportGroup: [], mobileLowPower: [] };
  }
  const a = Math.max(1, Math.floor(rest.length / 3));
  const b = Math.max(a, Math.floor((2 * rest.length) / 3));
  return {
    topLeaders,
    mainGroup: rest.slice(0, a),
    supportGroup: rest.slice(a, b),
    mobileLowPower: rest.slice(b),
  };
}

export function parseAndGroupRoster(raw: string): RosterParsed {
  const players = parseRosterLines(raw);
  return { players, groups: computeRosterGroups(players) };
}

function computePhaseCount(minutes: number): number {
  if (minutes <= 30) return 5;
  if (minutes <= 55) return 6;
  if (minutes <= 85) return 7;
  return 8;
}

function baseMinutesTemplate(count: number): readonly number[] {
  return BASE_OFFSET_MINUTES[count] ?? BASE_OFFSET_MINUTES[6]!;
}

/**
 * Offsets en secondes, T+0 à T+duration, monotone, dernière = durationSeconds exacte.
 */
export function computeFullDurationOffsetsSeconds(
  phaseCount: number,
  eventDurationMinutes: number,
  playStyle: PlayStyle,
): number[] {
  const durationSec = eventDurationMinutes * 60;
  const baseMin = baseMinutesTemplate(phaseCount);
  if (baseMin.length !== phaseCount) {
    throw new Error("[roster-generation] Internal: phase template length mismatch.");
  }
  const rawSec = baseMin.map((m) => Math.round((m / 60) * durationSec));
  const out = rawSec.map((sec, i) => {
    if (i === 0 || i === rawSec.length - 1) return sec;
    const u = durationSec > 0 ? sec / durationSec : 0;
    let v = u;
    if (playStyle === "aggressive") v = Math.pow(u, 0.82);
    else if (playStyle === "defensive") v = Math.pow(u, 1.2);
    return Math.round(v * durationSec);
  });
  out[0] = 0;
  out[out.length - 1] = durationSec;
  const minGap = 45;
  for (let i = 1; i < out.length - 1; i++) {
    out[i] = Math.max(out[i]!, out[i - 1]! + minGap);
  }
  out[out.length - 1] = durationSec;
  for (let i = out.length - 2; i >= 1; i--) {
    if (out[i]! >= out[i + 1]!) {
      out[i] = Math.max(out[i - 1]! + minGap, out[i + 1]! - minGap);
    }
  }
  out[out.length - 1] = durationSec;
  for (let i = 1; i < out.length; i++) {
    out[i] = Math.max(out[i]!, out[i - 1]!);
  }
  out[out.length - 1] = durationSec;
  return out;
}

function innerPhaseType(
  i: number,
  inner: number,
  playStyle: PlayStyle,
): BattlePhaseType {
  if (inner <= 1) return "OBJECTIVE";
  const ratio = i / (inner - 1);
  if (playStyle === "aggressive") {
    if (ratio <= 0.55) return i % 2 === 0 ? "OBJECTIVE" : "REMINDER";
    return i % 2 === 0 ? "REMINDER" : "OBJECTIVE";
  }
  if (playStyle === "defensive") {
    if (ratio >= 0.45) return i % 2 === 0 ? "REMINDER" : "OBJECTIVE";
    return i % 2 === 0 ? "OBJECTIVE" : "REMINDER";
  }
  return i % 2 === 0 ? "OBJECTIVE" : "REMINDER";
}

function buildPhaseTypes(
  count: number,
  playStyle: PlayStyle,
): BattlePhaseType[] {
  const types: BattlePhaseType[] = ["START"];
  const inner = count - 2;
  for (let i = 0; i < inner; i++) {
    types.push(innerPhaseType(i, inner, playStyle));
  }
  types.push("FINAL");
  return types;
}

function joinNames(list: RosterPlayer[], max = 8): string {
  const shown = list.slice(0, max).map((p) => p.name);
  const extra = list.length - max;
  if (extra > 0) return `${shown.join(", ")} (+${extra} autres)`;
  return shown.join(", ");
}

type RosterIntelMode = "opening" | "objective" | "reminder" | "final";

function leadersPair(
  groups: RosterGroups,
  players: RosterPlayer[],
): { leader: string; backup: string } {
  const leader =
    groups.topLeaders[0]?.name ?? players[0]?.name ?? "—";
  const backup =
    groups.topLeaders[1]?.name ??
    groups.mainGroup[0]?.name ??
    players[1]?.name ??
    "—";
  return { leader, backup };
}

/** Bloc lisible type war room (conservé dans objective — pas de colonne DB). */
function buildRosterAssignmentLines(
  groups: RosterGroups,
  players: RosterPlayer[],
  mode: RosterIntelMode,
): string {
  const { leader, backup } = leadersPair(groups, players);
  const defenders = joinNames(groups.mainGroup, 6);
  const mobile =
    joinNames(groups.mobileLowPower, 8) ||
    joinNames(groups.supportGroup, 8) ||
    "—";
  const coreLine = joinNames(
    [...groups.topLeaders, ...groups.mainGroup].slice(0, 8),
    8,
  );

  switch (mode) {
    case "opening":
      return `👤 Leader : ${leader}\n🛡 Noyau défense : ${defenders || coreLine}\n🔁 Mobile : ${mobile}`;
    case "objective":
      return `👤 Leader : ${leader}\n🔒 Appui : ${backup}\n🛡 Défense principale : ${defenders || "—"}\n🔁 Mobile : ${mobile}`;
    case "reminder":
      return `👤 Leader : ${leader}\n🔁 Flex & mobile : ${mobile}\n🛡 Renforts noyau : ${defenders || backup}`;
    case "final":
      return `👤 Leader : ${leader}\n🛡 Ligne complète : ${coreLine}\n🔁 Mobile : ${mobile}`;
    default:
      return "";
  }
}

function appendRosterIntel(
  objective: string,
  phaseType: BattlePhaseType,
  groups: RosterGroups,
  players: RosterPlayer[],
): string {
  const mode: RosterIntelMode =
    phaseType === "START"
      ? "opening"
      : phaseType === "FINAL"
        ? "final"
        : phaseType === "REMINDER"
          ? "reminder"
          : "objective";
  const block = buildRosterAssignmentLines(groups, players, mode);
  return block ? `${objective}\n\n${block}` : objective;
}

const SWORDLAND_MIN_MARKS = [0, 10, 15, 20, 30, 50, 60] as const;

/** Repères T+ (minutes) mis à l’échelle sur la durée événement — exporté pour timelines multi-légions. */
export function scaleSwordlandOffsetSeconds(
  eventDurationMinutes: number,
): number[] {
  const durationSec = eventDurationMinutes * 60;
  const n = SWORDLAND_MIN_MARKS.length;
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    if (i === n - 1) {
      out.push(durationSec);
    } else {
      const m = SWORDLAND_MIN_MARKS[i]!;
      out.push(Math.round((m / 60) * durationSec));
    }
  }
  out[0] = 0;
  out[out.length - 1] = durationSec;
  const minGap = 45;
  for (let i = 1; i < out.length - 1; i++) {
    out[i] = Math.max(out[i]!, out[i - 1]! + minGap);
  }
  for (let i = out.length - 2; i >= 1; i--) {
    if (out[i]! >= out[i + 1]!) {
      out[i] = Math.max(out[i - 1]! + minGap, out[i + 1]! - minGap);
    }
  }
  out[out.length - 1] = durationSec;
  for (let i = 1; i < out.length; i++) {
    out[i] = Math.max(out[i]!, out[i - 1]!);
  }
  out[out.length - 1] = durationSec;
  return out;
}

function generateSwordlandShowdownPhases(
  input: RosterGenerationInput,
): GeneratedRosterPhase[] {
  const { players, notes, eventDurationMinutes } = input;
  const groups = computeRosterGroups(players);
  const notesBlock = notes.trim()
    ? `\n\nNotes officiers : ${notes.trim()}`
    : "";

  const offsets = scaleSwordlandOffsetSeconds(eventDurationMinutes);

  const rows: {
    phaseType: BattlePhaseType;
    title: string;
    objective: string;
    action: string;
    nextHint: string;
    intel: RosterIntelMode;
  }[] = [
    {
      phaseType: "START",
      title: "Swordland — déploiement initial",
      objective: `Début de bataille : prise rapide des bâtiments stratégiques (contrôle carte > kills).${notesBlock}`,
      action:
        "Split propre : pas de fight inutile — un call vocal, priorités claires sur les flags.",
      nextHint: "Stabiliser avant la fenêtre de rotation (~15 min).",
      intel: "opening",
    },
    {
      phaseType: "OBJECTIVE",
      title: "Stabilisation du contrôle",
      objective:
        "Tenir tous les bâtiments capturés : défense continue, zéro rotation gratuite.",
      action:
        "Noyau sur les points clés, mobile sur les lignes de vue / retards ennemis.",
      nextHint: "Préparer la rotation Swordshrines / mercenaire / Hall.",
      intel: "objective",
    },
    {
      phaseType: "OBJECTIVE",
      title: "Rotation — objectifs dynamiques",
      objective:
        "Swordshrines, camp mercenaire, Hall of Reformation : priorité absolue sur le Hall si contest.",
      action:
        "Ouest / Est synchronisés — ne pas abandonner les bâtiments moteurs de points.",
      nextHint: "Renforcer avant toute relance de rallies massifs.",
      intel: "objective",
    },
    {
      phaseType: "REMINDER",
      title: "Renforts & respir",
      objective:
        "Check stocks, blessés, positions : renfort ciblé avant les grosses poussées.",
      action:
        "Leader valide les swaps — mobile couvre les flancs courts.",
      nextHint: "Enclencher la préparation de poussée finale au prochain repère.",
      intel: "reminder",
    },
    {
      phaseType: "OBJECTIVE",
      title: "Préparation — poussée finale",
      objective:
        "Alignement des timers, focus unique RL, cartographie des derniers objectifs.",
      action:
        "Pas d’overextension : on consolide l’avantage carte avant d’ouvrir le tempo.",
      nextHint: "Dernière ligne droite : respecter la fenêtre ville (10 dernières minutes).",
      intel: "objective",
    },
    {
      phaseType: "REMINDER",
      title: "Rappel — villes",
      objective:
        "Pas d’attaque de ville avant les 10 dernières minutes sauf ordre RL explicite.",
      action:
        "Priorité aux points structurels et au deny ennemi.",
      nextHint: "All-in final au signal RL.",
      intel: "reminder",
    },
    {
      phaseType: "FINAL",
      title: "Poussée totale — maximiser les points",
      objective:
        `Fin de créneau (T+${eventDurationMinutes} min) : tout le monde sur le plan de jeu validé.`,
      action:
        "Tempo max, un seul shotcaller — mobile en soutien / contest des retards.",
      nextHint: "Fin des annonces tactiques — debrief rapide au vocal.",
      intel: "final",
    },
  ];

  return rows.map((row, idx) => ({
    offsetSeconds: offsets[idx]!,
    phaseType: row.phaseType,
    title: row.title,
    objective: appendRosterIntel(
      row.objective,
      row.phaseType,
      groups,
      players,
    ),
    action: row.action,
    nextHint: row.nextHint,
    orderIndex: idx,
    key: `roster-swordland-${idx}-${randomKeySuffix()}`,
  }));
}

/**
 * Vérifie que la dernière phase tombe exactement sur la fin d’événement.
 */
export function assertTimelineCoversDuration(
  phases: Pick<GeneratedRosterPhase, "offsetSeconds">[],
  eventDurationMinutes: number,
): boolean {
  if (phases.length === 0) return false;
  const last = phases[phases.length - 1]!.offsetSeconds;
  return last === eventDurationMinutes * 60;
}

export function generateDraftPhasesFromRoster(
  input: RosterGenerationInput,
): GeneratedRosterPhase[] {
  const {
    players,
    eventType,
    notes,
    eventDurationMinutes,
    playStyle,
  } = input;
  const durationSec = eventDurationMinutes * 60;
  const copy = EVENT_COPY[eventType] ?? EVENT_COPY.GENERIC;
  const notesBlock = notes.trim()
    ? `\n\nNotes officiers : ${notes.trim()}`
    : "";
  const siegeExtra = copy.siegeHint ? ` ${copy.siegeHint}` : "";

  if (players.length === 0) {
    return [
      {
        offsetSeconds: 0,
        phaseType: "START",
        title: "Roster vide",
        objective:
          "Ajoute au moins une ligne « NOM PUISSANCE » puis régénère le brouillon.",
        action: "",
        nextHint: "Colle la liste des joueurs avec leur puissance.",
        orderIndex: 0,
        key: `roster-0-${randomKeySuffix()}`,
      },
      {
        offsetSeconds: durationSec,
        phaseType: "FINAL",
        title: "Fin d’événement",
        objective: "Complétez le roster pour générer un vrai déroulé.",
        action: "",
        nextHint: "",
        orderIndex: 1,
        key: `roster-1-${randomKeySuffix()}`,
      },
    ];
  }

  if (input.swordlandShowdownPreset) {
    return generateSwordlandShowdownPhases(input);
  }

  const groups = computeRosterGroups(players);
  const leaders = groups.topLeaders;
  const leaderLine = leaders
    .map((p) => `${p.name} (${fmtPowerShort(p.power)})`)
    .join(" · ");
  const topName = players[0]!.name;

  const phaseCount = computePhaseCount(eventDurationMinutes);
  const offsets = computeFullDurationOffsetsSeconds(
    phaseCount,
    eventDurationMinutes,
    playStyle,
  );
  const types = buildPhaseTypes(phaseCount, playStyle);

  const phases: GeneratedRosterPhase[] = [];
  const push = (
    idx: number,
    phaseType: BattlePhaseType,
    title: string,
    objective: string,
    action: string,
    nextHint: string,
  ) => {
    phases.push({
      offsetSeconds: offsets[idx]!,
      phaseType,
      title,
      objective,
      action,
      nextHint,
      orderIndex: idx,
      key: `roster-${idx}-${randomKeySuffix()}`,
    });
  };

  let idx = 0;
  push(
    idx,
    types[0]!,
    `${copy.startTitle} · départ`,
    appendRosterIntel(
      `Brouillon généré depuis roster (${players.length} joueur${players.length > 1 ? "s" : ""}). Candidats RL : ${leaderLine}.${idx === 0 ? notesBlock : ""}`,
      types[0]!,
      groups,
      players,
    ),
    `Confirmez le RL (ping vocal). ${topName} peut synchroniser si besoin.`,
    "Prochaine consigne au prochain repère horaire.",
  );
  idx += 1;

  const midTitles =
    playStyle === "aggressive"
      ? [
          "Poussée initiale — tempo haut",
          "Pression continue",
          "Verrouiller les gains",
        ]
      : playStyle === "defensive"
        ? [
            "Stabilisation & holds",
            "Renforts & rotations",
            "Consolider avant fin",
          ]
        : [copy.midTitle, "Milieu de mission", "Dernière ligne droite"];

  let midUsed = 0;
  for (; idx < phaseCount - 1; idx += 1) {
    const pt = types[idx]!;
    const coreFallback = [...groups.topLeaders, ...groups.mainGroup].slice(
      0,
      8,
    );
    const coreLabel =
      groups.mainGroup.length > 0
        ? joinNames(groups.mainGroup)
        : joinNames(coreFallback);
    const supportLabel =
      groups.supportGroup.length > 0
        ? joinNames(groups.supportGroup)
        : joinNames(groups.mobileLowPower);

    if (pt === "OBJECTIVE") {
      const title =
        midTitles[midUsed % midTitles.length] ??
        `${copy.midTitle} · phase ${idx}`;
      midUsed += 1;
      push(
        idx,
        "OBJECTIVE",
        title,
        appendRosterIntel(
          `Tête / noyau : ${coreLabel}.${siegeExtra}${
            playStyle === "aggressive"
              ? " Gardez l’initiative — un seul focus RL."
              : playStyle === "defensive"
                ? " Priorité aux positions tenues, pas au chase."
                : " Un objectif clair à la fois."
          }`,
          "OBJECTIVE",
          groups,
          players,
        ),
        playStyle === "aggressive"
          ? "Push selon ping RL — pas de split sans ordre."
          : playStyle === "defensive"
            ? "Renforcez les flancs faibles avant d’étendre."
            : "Suivez le call : focus unique.",
        "Anticipez le prochain rappel.",
      );
    } else {
      push(
        idx,
        "REMINDER",
        playStyle === "defensive"
          ? "Check défensif & stocks"
          : playStyle === "aggressive"
            ? "Rappel tempo"
            : "Point milieu",
        appendRosterIntel(
          groups.supportGroup.length > 0
            ? `Flex / soutien : ${supportLabel}.`
            : `Réserve : ${joinNames(groups.mobileLowPower)}.`,
          "REMINDER",
          groups,
          players,
        ),
        playStyle === "defensive"
          ? "Vérifiez blessés, boucliers, renforts."
          : "Hydratez, respirez, restez sur le vocal.",
        "Dernière ligne prête si swap demandé.",
      );
    }
  }

  push(
    phaseCount - 1,
    "FINAL",
    "Clôture de mission",
    appendRosterIntel(
      `Fin d’événement (T+${eventDurationMinutes} min). Synthèse rapide : ce qui a marché / à améliorer.`,
      "FINAL",
      groups,
      players,
    ),
    "Merci à l’équipe — capture utile si besoin.",
    "Fin des annonces tactiques.",
  );

  phases[phases.length - 1]!.offsetSeconds = durationSec;

  return phases;
}
