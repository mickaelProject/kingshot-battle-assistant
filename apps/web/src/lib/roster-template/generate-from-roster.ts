import type { BattlePhaseType } from "@prisma/client";
import type {
  GeneratedRosterPhase,
  RosterEventType,
  RosterGenerationInput,
  RosterPlayer,
} from "./types";

const DEFAULT_STEP = 300;

function randomKeySuffix(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID().replace(/-/g, "").slice(0, 10);
  }
  return String(Math.random()).slice(2, 12);
}

function fmtPower(p: number): string {
  if (p >= 1_000_000) return `${(p / 1_000_000).toFixed(1)}M`;
  if (p >= 1_000) return `${(p / 1_000).toFixed(1)}k`;
  return String(p);
}

/** Top players as RL / shot-caller hints (max 5). */
export function pickLeaderCandidates(
  players: RosterPlayer[],
  max = 5,
): RosterPlayer[] {
  if (players.length === 0) return [];
  const cap = Math.min(max, Math.max(1, Math.ceil(players.length * 0.12)));
  return players.slice(0, Math.min(cap, 5));
}

function squadByPowerTiers(players: RosterPlayer[]): {
  spear: RosterPlayer[];
  core: RosterPlayer[];
  reserve: RosterPlayer[];
} {
  const n = players.length;
  if (n === 0) {
    return { spear: [], core: [], reserve: [] };
  }
  const a = Math.max(1, Math.ceil(n / 3));
  const b = Math.max(a, Math.ceil((2 * n) / 3));
  return {
    spear: players.slice(0, a),
    core: players.slice(a, b),
    reserve: players.slice(b),
  };
}

function joinNames(list: RosterPlayer[], max = 8): string {
  const shown = list.slice(0, max).map((p) => p.name);
  const extra = list.length - max;
  if (extra > 0) return `${shown.join(", ")} (+${extra} autres)`;
  return shown.join(", ");
}

const EVENT_COPY: Record<
  RosterEventType,
  { startTitle: string; midTitle: string; siegeHint?: string }
> = {
  GENERIC: {
    startTitle: "Mise en place",
    midTitle: "Exécution",
  },
  RALLY: {
    startTitle: "Ralliement & checks",
    midTitle: "Ordre de marche",
  },
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

/**
 * Builds a **draft** timeline from roster power ranking.
 * Replace this module later with an AI-backed generator using the same signature.
 */
export function generatePhasesFromRoster(
  input: RosterGenerationInput,
): GeneratedRosterPhase[] {
  const { players, eventType, notes } = input;
  const copy = EVENT_COPY[eventType] ?? EVENT_COPY.GENERIC;
  const notesBlock = notes.trim()
    ? `\n\nNotes officiers : ${notes.trim()}`
    : "";
  const siegeExtra = copy.siegeHint ? ` ${copy.siegeHint}` : "";

  if (players.length === 0) {
    return [
      stubPhase(
        0,
        0,
        "START",
        "Roster vide",
        "Ajoute au moins une ligne « NOM PUISSANCE » puis régénère.",
        "",
        "Colle la liste des joueurs avec leur puissance.",
        0,
      ),
    ];
  }

  const leaders = pickLeaderCandidates(players);
  const leaderLine = leaders
    .map((p) => `${p.name} (${fmtPower(p.power)})`)
    .join(" · ");
  const { spear, core, reserve } = squadByPowerTiers(players);
  const topName = players[0]!.name;

  const phases: GeneratedRosterPhase[] = [];
  let order = 0;
  let t = 0;

  const push = (
    phaseType: BattlePhaseType,
    title: string,
    objective: string,
    action: string,
    nextHint: string,
  ) => {
    const idx = order;
    order += 1;
    phases.push({
      offsetSeconds: t,
      phaseType,
      title,
      objective: objective + (idx === 0 ? notesBlock : ""),
      action,
      nextHint,
      orderIndex: idx,
      key: `roster-${idx}-${randomKeySuffix()}`,
    });
    t += DEFAULT_STEP;
  };

  push(
    "START",
    `${copy.startTitle} · T+0`,
    `Roster analysé : ${players.length} joueur${players.length > 1 ? "s" : ""}. Candidats RL / shot-call (puissance) : ${leaderLine}.`,
    `Confirme le RL en voice. ${topName} mène la synchro si personne ne prend le lead.`,
    "Attends le top départ pour l’objectif suivant.",
  );

  push(
    "OBJECTIVE",
    `${copy.midTitle} · première poussée`,
    `Tête de lance (puissance haute) : ${joinNames(spear)}.${siegeExtra}`,
    `Focus unique : suivre le ping RL. Pas de scatter sans ordre.`,
    "Relance à mi-parcours si besoin.",
  );

  if (core.length > 0) {
    push(
      "REMINDER",
      "Milieu de tableau · flex",
      `Noyau : ${joinNames(core)} — renforts, flancs, ou swap selon RL.`,
      "Garde une réserve de marche pour colmater.",
      "Dernière ligne / bench prêts derrière.",
    );
  }

  if (reserve.length > 0) {
    push(
      "REMINDER",
      "Réserve & bench",
      `Réserve : ${joinNames(reserve)} — prêts à remplacer ou tenir un second objectif.`,
      "Ne force pas l’ego pick : la puissance bas sert souvent à verrouiller.",
      "Prépare le call de fin.",
    );
  }

  push(
    "FINAL",
    "Clôture",
    "Synthèse rapide : ce qui a marché / à corriger pour la prochaine fois.",
    "Merci à tous — capture l’écran score si utile.",
    "Fin de session tactique.",
  );

  return phases;
}

function stubPhase(
  offsetSeconds: number,
  orderIndex: number,
  phaseType: BattlePhaseType,
  title: string,
  objective: string,
  action: string,
  nextHint: string,
  keyIdx: number,
): GeneratedRosterPhase {
  return {
    offsetSeconds,
    phaseType,
    title,
    objective,
    action,
    nextHint,
    orderIndex,
    key: `roster-${keyIdx}-${randomKeySuffix()}`,
  };
}
