import type {
  BattlePhaseType,
  ManagedEventStatus,
  ReminderStatus,
} from "@prisma/client";
import { Prisma } from "@prisma/client";
import { getEventTypeDefinition } from "@/lib/event-intelligence";
import { defaultLocale, type AppLocale } from "@/i18n/config";
import { buildingLabel } from "@/lib/live-battle-view";
import {
  translateManyToEnglish,
  translateToEnglish,
} from "@/lib/live-translate-en";
import { prisma } from "@/lib/prisma";

export type LivePlayerPhaseDTO = {
  phaseType: BattlePhaseType;
  title: string;
  objective: string;
  action: string;
  nextHint: string;
  /** Phase annoncée sur Discord */
  pendingNotSent: boolean;
  /** Pour détecter les transitions (animation / vibration) */
  phaseKey: string;
  /** Textes fournis par i18n côté client (voir `livePlayer.synthetic.*`) */
  syntheticUi?: "scheduled" | "starting" | "ended" | "active_idle";
};

export type LivePlayerNextDTO = {
  phaseType: BattlePhaseType;
  title: string;
  objective: string;
  scheduledAtIso: string;
  phaseKey: string;
};

export type LivePlayerViewDTO = {
  runId: string;
  missionTitle: string;
  runStatus: ManagedEventStatus;
  isPaused: boolean;
  eventDurationMinutes: number;
  sessionStartedAtIso: string | null;
  scheduledAtIso: string;
  eventDisplayName: string;
  currentPhase: LivePlayerPhaseDTO | null;
  nextPhase: LivePlayerNextDTO | null;
  countdownToNextIso: string | null;
  assignedBuilding: string | null;
  assignedSide: "west" | "east" | null;
  legionIndex: number | null;
  leaderName: string | null;
  personalSlotLabel: string | null;
  /** `?me=` was present in the URL */
  meQueryProvided: boolean;
  /** Matched a player assignment for `me` (Discord id or name) */
  hasPersonalAssignment: boolean;
};

type RemRow = {
  id: string;
  status: ReminderStatus;
  phaseType: BattlePhaseType;
  title: string;
  objective: string;
  action: string;
  nextHint: string;
  scheduledAt: Date;
};

function toCurrentDto(
  r: RemRow,
  pendingNotSent: boolean,
  phaseKey: string,
): LivePlayerPhaseDTO {
  return {
    phaseType: r.phaseType,
    title: r.title?.trim() || "",
    objective: r.objective?.trim() || "",
    action: r.action?.trim() || "",
    nextHint: r.nextHint?.trim() || "",
    pendingNotSent,
    phaseKey,
  };
}

function toNextDto(r: RemRow, phaseKey: string): LivePlayerNextDTO {
  return {
    phaseType: r.phaseType,
    title: r.title?.trim() || "",
    objective: r.objective?.trim() || "",
    scheduledAtIso: r.scheduledAt.toISOString(),
    phaseKey,
  };
}

function syntheticPhase(
  phaseType: BattlePhaseType,
  syntheticUi: NonNullable<LivePlayerPhaseDTO["syntheticUi"]>,
  phaseKey: string,
): LivePlayerPhaseDTO {
  return {
    phaseType,
    title: "",
    objective: "",
    action: "",
    nextHint: "",
    pendingNotSent: false,
    phaseKey,
    syntheticUi,
  };
}

function resolvePhases(
  runStatus: ManagedEventStatus,
  scheduledAt: Date,
  reminders: RemRow[],
): {
  current: LivePlayerPhaseDTO | null;
  next: LivePlayerNextDTO | null;
  countdownIso: string | null;
} {
  const sorted = [...reminders].sort(
    (a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime(),
  );
  const pending = sorted.filter((r) => r.status === "PENDING");

  if (runStatus === "SCHEDULED") {
    return {
      current: syntheticPhase("START", "scheduled", "synthetic:scheduled"),
      next: null,
      countdownIso: scheduledAt.toISOString(),
    };
  }

  if (runStatus === "STARTING") {
    const first = pending[0];
    return {
      current: syntheticPhase("START", "starting", "synthetic:starting"),
      next: first ? toNextDto(first, `next:${first.id}`) : null,
      countdownIso: first?.scheduledAt.toISOString() ?? null,
    };
  }

  if (
    runStatus === "COMPLETED" ||
    runStatus === "CANCELLED" ||
    runStatus === "FAILED"
  ) {
    return {
      current: syntheticPhase("FINAL", "ended", `synthetic:ended:${runStatus}`),
      next: null,
      countdownIso: null,
    };
  }

  if (runStatus === "ACTIVE") {
    const sent = sorted.filter((r) => r.status === "SENT");
    const lastSent = sent.length
      ? sent.reduce((a, b) =>
          a.scheduledAt.getTime() > b.scheduledAt.getTime() ? a : b,
        )
      : null;

    if (lastSent) {
      const nextAfter =
        pending.find((r) => r.scheduledAt > lastSent.scheduledAt) ?? null;
      const current = toCurrentDto(lastSent, false, `sent:${lastSent.id}`);
      const next = nextAfter ? toNextDto(nextAfter, `next:${nextAfter.id}`) : null;
      return {
        current,
        next,
        countdownIso: nextAfter?.scheduledAt.toISOString() ?? null,
      };
    }

    if (pending[0]) {
      const p0 = pending[0];
      const p1 = pending[1];
      const current = toCurrentDto(p0, true, `pending:${p0.id}`);
      const next = p1 ? toNextDto(p1, `next:${p1.id}`) : null;
      return {
        current,
        next,
        countdownIso: p0.scheduledAt.toISOString(),
      };
    }

    return {
      current: syntheticPhase(
        "FINAL",
        "active_idle",
        "synthetic:active-empty",
      ),
      next: null,
      countdownIso: null,
    };
  }

  return {
    current: null,
    next: null,
    countdownIso: null,
  };
}

function isP2022IsPaused(e: unknown): boolean {
  return (
    e instanceof Prisma.PrismaClientKnownRequestError &&
    e.code === "P2022" &&
    /isPaused/i.test(`${e.message}${JSON.stringify(e.meta ?? {})}`)
  );
}

function isP2022EventDuration(e: unknown): boolean {
  return (
    e instanceof Prisma.PrismaClientKnownRequestError &&
    e.code === "P2022" &&
    /eventDurationMinutes/i.test(`${e.message}${JSON.stringify(e.meta ?? {})}`)
  );
}

function isDiscordSnowflake(s: string): boolean {
  return /^\d{17,20}$/.test(s.trim());
}

async function findPlayerAssignmentForMe(
  sessionId: string,
  meRaw: string,
): Promise<{
  buildingKey: string | null;
  side: string | null;
  legionIndex: number | null;
  leaderName: string | null;
  slotLabel: string;
} | null> {
  const me = meRaw.trim();
  if (!me) return null;

  const select = {
    buildingKey: true,
    side: true,
    legionIndex: true,
    leaderName: true,
    slotLabel: true,
  } as const;

  if (isDiscordSnowflake(me)) {
    return prisma.playerAssignment.findFirst({
      where: { sessionId, userId: me },
      select,
    });
  }

  const byLeaderExact = await prisma.playerAssignment.findFirst({
    where: {
      sessionId,
      leaderName: { equals: me, mode: "insensitive" },
    },
    select,
  });
  if (byLeaderExact) return byLeaderExact;

  const bySlotExact = await prisma.playerAssignment.findFirst({
    where: {
      sessionId,
      slotLabel: { equals: me, mode: "insensitive" },
    },
    select,
  });
  if (bySlotExact) return bySlotExact;

  return prisma.playerAssignment.findFirst({
    where: {
      sessionId,
      OR: [
        { leaderName: { contains: me, mode: "insensitive" } },
        { slotLabel: { contains: me, mode: "insensitive" } },
      ],
    },
    select,
  });
}

async function translatePhaseDto(
  p: LivePlayerPhaseDTO,
): Promise<LivePlayerPhaseDTO> {
  if (p.syntheticUi) return p;
  const [title, objective, action, nextHint] = await translateManyToEnglish([
    p.title,
    p.objective,
    p.action,
    p.nextHint,
  ]);
  return { ...p, title, objective, action, nextHint };
}

async function translateNextDto(
  n: LivePlayerNextDTO,
): Promise<LivePlayerNextDTO> {
  const [title, objective] = await translateManyToEnglish([n.title, n.objective]);
  return { ...n, title, objective };
}

async function fetchRunRow(
  runId: string,
  withPause: boolean,
  withDuration: boolean,
) {
  return prisma.managedEventRun.findFirst({
    where: { id: runId },
    select: {
      id: true,
      status: true,
      scheduledAt: true,
      template: {
        select: {
          name: true,
          eventProductKey: true,
          ...(withDuration ? { eventDurationMinutes: true } : {}),
        },
      },
      session: {
        select: {
          id: true,
          startedAt: true,
          ...(withPause ? { isPaused: true } : {}),
          reminders: {
            orderBy: { scheduledAt: "asc" },
            select: {
              id: true,
              status: true,
              phaseType: true,
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
}

/**
 * Données JSON pour `/live/[runId]` et polling `GET /api/live/[runId]`.
 * Les textes issus de la base (phases) restent en français sauf si `locale === "en"`
 * (traduction optionnelle FR→EN). `fr` / `es` : pas de traduction machine.
 */
export async function buildLivePlayerViewPayload(
  runId: string,
  playerDiscordUserId?: string | null,
  options?: { locale?: AppLocale },
): Promise<LivePlayerViewDTO | null> {
  const locale = options?.locale ?? defaultLocale;
  const translatePhasesToEn = locale === "en";
  let withPause = true;
  let withDuration = true;
  let run: Awaited<ReturnType<typeof fetchRunRow>> = null;

  for (let attempt = 0; attempt < 8; attempt++) {
    try {
      run = await fetchRunRow(runId, withPause, withDuration);
      break;
    } catch (e) {
      if (isP2022IsPaused(e)) {
        withPause = false;
        continue;
      }
      if (isP2022EventDuration(e)) {
        withDuration = false;
        continue;
      }
      throw e;
    }
  }

  if (!run) return null;

  const reminders = (run.session?.reminders ?? []) as RemRow[];
  const intel = getEventTypeDefinition(run.template.eventProductKey);
  const eventDurationMinutes = withDuration
    ? (run.template as { eventDurationMinutes?: number }).eventDurationMinutes ??
      60
    : 60;

  let { current, next, countdownIso } = resolvePhases(
    run.status,
    run.scheduledAt,
    reminders,
  );

  if (translatePhasesToEn && current && !current.syntheticUi) {
    current = await translatePhaseDto(current);
  }
  if (translatePhasesToEn && next) {
    next = await translateNextDto(next);
  }

  let assignedBuilding: string | null = null;
  let assignedSide: "west" | "east" | null = null;
  let legionIndex: number | null = null;
  let leaderName: string | null = null;
  let personalSlotLabel: string | null = null;
  let hasPersonalAssignment = false;

  const meRaw = playerDiscordUserId?.trim() ?? "";
  const meQueryProvided = Boolean(meRaw);

  if (meRaw && run.session?.id) {
    const a = await findPlayerAssignmentForMe(run.session.id, meRaw);
    if (a) {
      hasPersonalAssignment = true;
      assignedBuilding = buildingLabel(a.buildingKey);
      const s = a.side?.trim().toLowerCase();
      assignedSide = s === "west" || s === "east" ? s : null;
      legionIndex = a.legionIndex ?? null;
      leaderName = a.leaderName?.trim() || null;
      personalSlotLabel = a.slotLabel?.trim() || null;
    }
  }

  const isPaused = withPause ? Boolean(run.session?.isPaused) : false;

  const eventDisplayName = translatePhasesToEn
    ? await translateToEnglish(intel.displayName)
    : intel.displayName;

  return {
    runId: run.id,
    missionTitle: run.template.name,
    runStatus: run.status,
    isPaused,
    eventDurationMinutes,
    sessionStartedAtIso: run.session?.startedAt.toISOString() ?? null,
    scheduledAtIso: run.scheduledAt.toISOString(),
    eventDisplayName,
    currentPhase: current,
    nextPhase: next,
    countdownToNextIso: countdownIso,
    assignedBuilding,
    assignedSide,
    legionIndex,
    leaderName,
    personalSlotLabel,
    meQueryProvided,
    hasPersonalAssignment,
  };
}
