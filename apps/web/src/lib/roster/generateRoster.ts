/**
 * Génération roster / structure tactique par type d’événement (côté client ou partagé).
 * Ne remplace pas la persistance Prisma ni les phases Discord — complète l’UI du wizard.
 */

import { pickLeaderCandidates } from "@/lib/roster-generation.service";
import type { RosterPlayer } from "@/lib/roster-template/types";
import type { EventType } from "@/lib/events/event-registry";
import {
  buildFullTacticalWarPlan,
  mergeLegionPlayersUnique,
  type ParsedLegion,
  type TacticalWarPlan,
} from "@/lib/tactical-war-plan";

export type GenerateRosterInput = {
  legion1: RosterPlayer[];
  /** Optionnel selon l’événement (mobilization peut n’utiliser que L1). */
  legion2?: RosterPlayer[];
};

export type SwordlandRosterOutput = {
  eventType: "swordland";
  tacticalPlan: TacticalWarPlan;
  leaders: RosterPlayer[];
  mergedPlayers: RosterPlayer[];
};

export type KvkPreparationTask = {
  id: string;
  title: string;
  description: string;
  players: RosterPlayer[];
};

export type KvkPreparationOutput = {
  eventType: "kvk_preparation";
  tasks: KvkPreparationTask[];
  mergedPlayers: RosterPlayer[];
};

export type KvkWarRole = "rally_leader" | "garrison" | "support";

export type KvkWarOutput = {
  eventType: "kvk_war";
  roles: Record<KvkWarRole, RosterPlayer[]>;
  mergedPlayers: RosterPlayer[];
};

export type SanctuarySlot = {
  id: string;
  label: string;
  attack: RosterPlayer[];
  defense: RosterPlayer[];
};

export type SanctuaryBattleOutput = {
  eventType: "sanctuary_battle";
  slots: SanctuarySlot[];
  mergedPlayers: RosterPlayer[];
};

export type MobilizationMission = {
  id: string;
  title: string;
  quota: number;
  players: RosterPlayer[];
};

export type AllianceMobilizationOutput = {
  eventType: "alliance_mobilization";
  missions: MobilizationMission[];
  mergedPlayers: RosterPlayer[];
};

export type FlamedragonGroup = {
  id: string;
  label: string;
  players: RosterPlayer[];
};

export type FlamedragonTyrantOutput = {
  eventType: "flamedragon_tyrant";
  groups: FlamedragonGroup[];
  rotationOrder: string[];
  mergedPlayers: RosterPlayer[];
};

export type KingdomTransferGroup = {
  id: string;
  label: string;
  players: RosterPlayer[];
};

export type KingdomTransferOutput = {
  eventType: "kingdom_transfer";
  groups: KingdomTransferGroup[];
  mergedPlayers: RosterPlayer[];
};

export type GeneratedRosterResult =
  | SwordlandRosterOutput
  | KvkPreparationOutput
  | KvkWarOutput
  | SanctuaryBattleOutput
  | AllianceMobilizationOutput
  | FlamedragonTyrantOutput
  | KingdomTransferOutput;

function mergedSorted(input: GenerateRosterInput): RosterPlayer[] {
  const merged = mergeLegionPlayersUnique([
    { index: 1, rawLines: [], players: input.legion1 },
    { index: 2, rawLines: [], players: input.legion2 ?? [] },
  ]);
  return [...merged].sort((a, b) => b.power - a.power);
}

function chunkByCount<T>(items: T[], sizes: number[]): T[][] {
  const out: T[][] = sizes.map(() => []);
  let i = 0;
  for (let s = 0; s < sizes.length; s++) {
    const take = sizes[s]!;
    out[s] = items.slice(i, i + take);
    i += take;
  }
  if (i < items.length) {
    const last = out[out.length - 1];
    if (last) last.push(...items.slice(i));
  }
  return out;
}

function splitIntoGroups(players: RosterPlayer[], groupCount: number): RosterPlayer[][] {
  if (players.length === 0) return Array.from({ length: groupCount }, () => []);
  const base = Math.floor(players.length / groupCount);
  const extra = players.length % groupCount;
  const sizes = Array.from({ length: groupCount }, (_, i) => base + (i < extra ? 1 : 0));
  return chunkByCount(players, sizes);
}

export function generateRoster(
  eventType: EventType,
  input: GenerateRosterInput,
): GeneratedRosterResult {
  const mergedPlayers = mergedSorted(input);

  switch (eventType) {
    case "swordland": {
      const legions: ParsedLegion[] = [];
      const l1 = [...input.legion1].sort((a, b) => b.power - a.power);
      const l2 = [...(input.legion2 ?? [])].sort((a, b) => b.power - a.power);
      if (l1.length) legions.push({ index: 1, rawLines: [], players: l1 });
      if (l2.length) legions.push({ index: 2, rawLines: [], players: l2 });
      if (legions.length === 0) {
        return {
          eventType: "swordland",
          tacticalPlan: buildFullTacticalWarPlan("SWORDLAND", [], 7),
          leaders: [],
          mergedPlayers: [],
        };
      }
      const tacticalPlan = buildFullTacticalWarPlan("SWORDLAND", legions, 7);
      return {
        eventType: "swordland",
        tacticalPlan,
        leaders: pickLeaderCandidates(mergedPlayers),
        mergedPlayers,
      };
    }

    case "kvk_preparation": {
      const n = mergedPlayers.length;
      const a = Math.ceil(n / 3);
      const b = n === 0 ? 0 : Math.ceil((n - a) / 2);
      const farm = mergedPlayers.slice(0, a);
      const res = mergedPlayers.slice(a, a + b);
      const troops = mergedPlayers.slice(a + b);
      return {
        eventType: "kvk_preparation",
        mergedPlayers,
        tasks: [
          {
            id: "farming",
            title: "Farming",
            description: "Collecte et optimisation RSS avant fenêtre KvK.",
            players: farm,
          },
          {
            id: "resources",
            title: "Ressources",
            description: "Stocks, accélérateurs et transferts intra-alliance.",
            players: res,
          },
          {
            id: "troop_prep",
            title: "Préparation troupes",
            description: "Hôpital, formations, héros et timers de soin.",
            players: troops,
          },
        ],
      };
    }

    case "kvk_war": {
      const n = mergedPlayers.length;
      const nRally = n === 0 ? 0 : Math.max(1, Math.ceil(n * 0.15));
      const nGar = n === 0 ? 0 : Math.floor(n * 0.35);
      const rally = mergedPlayers.slice(0, nRally);
      const garrison = mergedPlayers.slice(nRally, nRally + nGar);
      const support = mergedPlayers.slice(nRally + nGar);
      return {
        eventType: "kvk_war",
        mergedPlayers,
        roles: {
          rally_leader: rally,
          garrison,
          support,
        },
      };
    }

    case "sanctuary_battle": {
      const slots: SanctuarySlot[] = [
        { id: "t1", label: "Créneau T+0–30 — attaque", attack: [], defense: [] },
        { id: "t2", label: "Créneau T+30–60 — défense", attack: [], defense: [] },
        { id: "t3", label: "Créneau T+60–90 — mixte", attack: [], defense: [] },
      ];
      mergedPlayers.forEach((p, i) => {
        const slot = slots[i % 3]!;
        if (i % 2 === 0) slot.attack.push(p);
        else slot.defense.push(p);
      });
      return { eventType: "sanctuary_battle", slots, mergedPlayers };
    }

    case "alliance_mobilization": {
      const missionDefs = [
        { id: "m1", title: "Don d’alliance" },
        { id: "m2", title: "Technologie / construction" },
        { id: "m3", title: "Entraînement troupes" },
        { id: "m4", title: "Ralliements d’entraide" },
      ];
      const missions: MobilizationMission[] = missionDefs.map((m) => ({
        id: m.id,
        title: m.title,
        quota: 0,
        players: [] as RosterPlayer[],
      }));
      mergedPlayers.forEach((p, i) => {
        missions[i % 4]!.players.push(p);
      });
      for (const m of missions) m.quota = m.players.length;
      return { eventType: "alliance_mobilization", missions, mergedPlayers };
    }

    case "flamedragon_tyrant": {
      const groupSize = 6;
      const groups: FlamedragonGroup[] = [];
      for (let i = 0; i < mergedPlayers.length; i += groupSize) {
        const chunk = mergedPlayers.slice(i, i + groupSize);
        groups.push({
          id: `g${groups.length + 1}`,
          label: `Groupe ${groups.length + 1}`,
          players: chunk,
        });
      }
      const rotationOrder = groups.map((g) => g.label);
      return {
        eventType: "flamedragon_tyrant",
        groups,
        rotationOrder,
        mergedPlayers,
      };
    }

    case "kingdom_transfer": {
      const groupCount = Math.min(4, Math.max(2, Math.ceil(mergedPlayers.length / 8)));
      const parts = splitIntoGroups(mergedPlayers, groupCount);
      const groups: KingdomTransferGroup[] = parts.map((players, i) => ({
        id: `convoy-${i + 1}`,
        label: `Convoi ${i + 1}`,
        players,
      }));
      return { eventType: "kingdom_transfer", groups, mergedPlayers };
    }

  }
}
