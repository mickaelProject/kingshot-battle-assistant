import {
  type BattlePhaseType,
  type BattleSession,
  ManagedEventStatus,
  type ReminderStatus,
  Prisma,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";

function p2022Blob(e: unknown): string {
  if (!(e instanceof Prisma.PrismaClientKnownRequestError)) return "";
  return `${e.message}${JSON.stringify(e.meta ?? {})}`;
}

type OverviewReminder = {
  status: ReminderStatus;
  title: string;
  phaseType: BattlePhaseType;
  scheduledAt: Date;
};

/** Données nécessaires à la vue d’accueil (sans colonnes légion du run — évite P2022 client/base désalignés). */
export type OverviewActiveRun = {
  id: string;
  template: {
    name: string;
    eventDurationMinutes: number;
    eventProductKey: string | null;
    _count: { events: number };
  };
  session: (BattleSession & { reminders: OverviewReminder[] }) | null;
};

const reminderSelect = {
  status: true,
  title: true,
  phaseType: true,
  scheduledAt: true,
} as const;

function buildOverviewRunSelect(flags: {
  channelNameSnapshot: boolean;
  templateEventDuration: boolean;
}): Prisma.ManagedEventRunSelect {
  return {
    id: true,
    guildSettingsId: true,
    templateId: true,
    channelId: true,
    scheduledAt: true,
    status: true,
    battleSessionId: true,
    errorMessage: true,
    completedAt: true,
    createdAt: true,
    updatedAt: true,
    ...(flags.channelNameSnapshot ? { channelNameSnapshot: true } : {}),
    guild: { select: { discordGuildId: true } },
    template: {
      select: {
        name: true,
        eventProductKey: true,
        _count: { select: { events: true } },
        ...(flags.templateEventDuration ? { eventDurationMinutes: true } : {}),
      },
    },
    session: true,
  };
}

function looksLikeStartingStatusError(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e);
  if (e instanceof Prisma.PrismaClientValidationError && /STARTING/i.test(msg)) {
    return true;
  }
  if (e instanceof Prisma.PrismaClientKnownRequestError) {
    return /STARTING|ManagedEventStatus|enum/i.test(msg);
  }
  return false;
}

function isPrismaUnavailableError(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e);
  if (e instanceof Prisma.PrismaClientInitializationError) return true;
  if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P1001") {
    return true;
  }
  return /can't reach database|database server|connect/i.test(msg);
}

async function findOverviewRunWithStatuses(
  selectFlags: { channelNameSnapshot: boolean; templateEventDuration: boolean },
  statuses: ManagedEventStatus[],
): Promise<{
  row: Prisma.ManagedEventRunGetPayload<{
    select: ReturnType<typeof buildOverviewRunSelect>;
  }> | null;
}> {
  const select = buildOverviewRunSelect(selectFlags);
  const row = await prisma.managedEventRun.findFirst({
    where: { status: { in: statuses } },
    orderBy: { updatedAt: "desc" },
    select,
  });
  return { row };
}

/**
 * Run « en direct » pour la vue d’accueil (ACTIVE + STARTING).
 * Select explicite sans colonnes légion sur ManagedEventRun (tolère migrations / client Prisma).
 * Repli sur ACTIVE seul si l’enum STARTING pose problème.
 */
export async function fetchOverviewActiveRun(): Promise<OverviewActiveRun | null> {
  let channelNameSnapshot = true;
  let templateEventDuration = true;

  for (let attempt = 0; attempt < 16; attempt++) {
    const flags = { channelNameSnapshot, templateEventDuration };
    let base: Awaited<
      ReturnType<typeof findOverviewRunWithStatuses>
    >["row"] | null = null;

    try {
      const r = await findOverviewRunWithStatuses(flags, [
        ManagedEventStatus.ACTIVE,
        ManagedEventStatus.STARTING,
      ]);
      base = r.row;
    } catch (e) {
      if (isPrismaUnavailableError(e)) return null;
      if (looksLikeStartingStatusError(e)) {
        try {
          const r = await findOverviewRunWithStatuses(flags, [
            ManagedEventStatus.ACTIVE,
          ]);
          base = r.row;
        } catch (e2) {
          if (isPrismaUnavailableError(e2)) return null;
          if (!(e2 instanceof Prisma.PrismaClientKnownRequestError)) throw e2;
          const blob = p2022Blob(e2);
          if (e2.code === "P2022") {
            if (/channelNameSnapshot/i.test(blob)) channelNameSnapshot = false;
            else if (/eventDurationMinutes/i.test(blob)) templateEventDuration = false;
            else throw e2;
            continue;
          }
          throw e2;
        }
      } else if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === "P2022"
      ) {
        const blob = p2022Blob(e);
        if (/channelNameSnapshot/i.test(blob)) channelNameSnapshot = false;
        else if (/eventDurationMinutes/i.test(blob)) templateEventDuration = false;
        else throw e;
        continue;
      } else {
        throw e;
      }
    }

    if (!base) return null;

    const tpl = base.template as unknown as {
      name: string;
      eventProductKey: string | null;
      eventDurationMinutes?: number;
      _count: { events: number };
    };

    let reminders: OverviewReminder[] = [];
    if (base.session != null) {
      try {
        reminders = await prisma.battleReminder.findMany({
          where: { sessionId: base.session.id },
          orderBy: { scheduledAt: "asc" },
          take: 200,
          select: reminderSelect,
        });
      } catch (e) {
        if (isPrismaUnavailableError(e)) return null;
        throw e;
      }
    }

    const eventDurationMinutes = tpl.eventDurationMinutes ?? 60;

    return {
      id: base.id,
      template: {
        name: tpl.name,
        eventDurationMinutes,
        eventProductKey: tpl.eventProductKey ?? null,
        _count: tpl._count,
      },
      session: base.session
        ? { ...base.session, reminders }
        : null,
    } as OverviewActiveRun;
  }

  throw new Error(
    "[kingshot] Impossible de charger le run actif (overview) : schéma base incompatible.",
  );
}
