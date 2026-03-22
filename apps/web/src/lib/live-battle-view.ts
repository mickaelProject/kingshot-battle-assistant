import type { ManagedEventStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getEventTypeDefinition } from "@/lib/event-intelligence";

export type LiveBattlePayload = {
  runId: string;
  missionTitle: string;
  status: ManagedEventStatus;
  /** Clé intelligence produit */
  eventProductKey: string;
  eventDisplayName: string;
  currentObjective: string;
  nextAction: string;
  /** Cible du compte à rebours (ISO) */
  countdownTargetIso: string | null;
  assignedBuilding: string | null;
  assignedSide: "west" | "east" | null;
  legionLabel: string | null;
  leaderName: string | null;
  personalSlotLabel: string | null;
};

export function buildingLabel(key: string | null): string | null {
  if (!key?.trim()) return null;
  const k = key.trim();
  const pretty: Record<string, string> = {
    bell_tower: "Bell Tower",
    sanctum1: "Sanctum 1",
    sanctum2: "Sanctum 2",
    abbey1: "Abbey 1",
    abbey2: "Abbey 2",
    abbey3: "Abbey 3",
    abbey4: "Abbey 4",
    stables: "Royal Stables",
    hall_reformation: "Hall of Reformation",
    mercenary_camp: "Mercenary Camp",
    swordshrines: "Swordshrines",
  };
  return pretty[k] ?? k.replace(/_/g, " ");
}

/**
 * Données lecture seule pour l’écran joueur.
 * `playerDiscordUserId` : snowflake Discord pour personnaliser bâtiment / légion / côté (assignations).
 */
export async function fetchLiveBattlePayload(
  runId: string,
  playerDiscordUserId?: string | null,
): Promise<LiveBattlePayload | null> {
  const run = await prisma.managedEventRun.findFirst({
    where: { id: runId },
    select: {
      id: true,
      status: true,
      scheduledAt: true,
      template: {
        select: {
          name: true,
          eventProductKey: true,
        },
      },
      session: {
        select: {
          id: true,
          reminders: {
            orderBy: { scheduledAt: "asc" },
            select: {
              status: true,
              title: true,
              objective: true,
              action: true,
              nextHint: true,
              scheduledAt: true,
            },
          },
        },
      },
    },
  });

  if (!run) return null;

  const intel = getEventTypeDefinition(run.template.eventProductKey);
  const reminders = run.session?.reminders ?? [];

  const lastSent = [...reminders]
    .reverse()
    .find(
      (r) =>
        r.status === "SENT" &&
        Boolean(r.objective?.trim() || r.title?.trim()),
    );
  const nextPending = reminders.find((r) => r.status === "PENDING");

  let currentObjective: string;
  let nextAction: string;
  let countdownTargetIso: string | null;

  if (run.status === "SCHEDULED") {
    currentObjective = `Mission planifiée — ${run.template.name}`;
    nextAction =
      "Rendez-vous sur le salon Discord au moment du départ. Suivez les annonces du bot.";
    countdownTargetIso = run.scheduledAt.toISOString();
  } else if (run.status === "STARTING") {
    currentObjective = "Démarrage de la session…";
    nextAction = "Les rappels vont s’enchaîner selon le modèle.";
    countdownTargetIso = nextPending?.scheduledAt.toISOString() ?? null;
  } else if (run.status === "ACTIVE") {
    currentObjective =
      lastSent?.objective?.trim() ||
      lastSent?.title?.trim() ||
      nextPending?.objective?.trim() ||
      nextPending?.title?.trim() ||
      "Objectif en cours de diffusion.";
    nextAction =
      nextPending?.action?.trim() ||
      nextPending?.nextHint?.trim() ||
      "Attendez la prochaine annonce.";
    countdownTargetIso = nextPending?.scheduledAt.toISOString() ?? null;
  } else {
    currentObjective =
      run.status === "COMPLETED"
        ? "Mission terminée."
        : run.status === "CANCELLED"
          ? "Mission annulée."
          : run.status === "FAILED"
            ? "Mission en échec."
            : "Mission close.";
    nextAction = "—";
    countdownTargetIso = null;
  }

  let assignedBuilding: string | null = null;
  let assignedSide: "west" | "east" | null = null;
  let legionLabel: string | null = null;
  let leaderName: string | null = null;
  let personalSlotLabel: string | null = null;

  const uid = playerDiscordUserId?.trim();
  if (uid && run.session?.id) {
    const a = await prisma.playerAssignment.findFirst({
      where: { sessionId: run.session.id, userId: uid },
      select: {
        buildingKey: true,
        side: true,
        legionIndex: true,
        leaderName: true,
        slotLabel: true,
      },
    });
    if (a) {
      assignedBuilding = buildingLabel(a.buildingKey);
      const s = a.side?.trim().toLowerCase();
      assignedSide = s === "west" || s === "east" ? s : null;
      legionLabel = a.legionIndex != null ? `Légion ${a.legionIndex}` : null;
      leaderName = a.leaderName?.trim() || null;
      personalSlotLabel = a.slotLabel?.trim() || null;
    }
  }

  return {
    runId: run.id,
    missionTitle: run.template.name,
    status: run.status,
    eventProductKey: intel.key,
    eventDisplayName: intel.displayName,
    currentObjective,
    nextAction,
    countdownTargetIso,
    assignedBuilding,
    assignedSide,
    legionLabel,
    leaderName,
    personalSlotLabel,
  };
}
