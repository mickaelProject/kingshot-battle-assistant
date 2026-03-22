import {
  type BattlePhaseType,
  type ManagedEventStatus,
  Prisma,
  type ReminderStatus,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";

/** Ligne « carte run » (liste Exécutions), toujours normalisée pour l’UI. */
export type ManagedRunListRow = {
  id: string;
  guildSettingsId: string;
  templateId: string;
  channelId: string;
  channelNameSnapshot: string | null;
  scheduledAt: Date;
  status: ManagedEventStatus;
  battleSessionId: string | null;
  errorMessage: string | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  guild: { discordGuildId: string };
  template: {
    name: string;
    eventDurationMinutes: number;
    _count: { events: number };
  };
  session: {
    id: string;
    startedAt: Date;
    isPaused: boolean;
    reminders: {
      status: ReminderStatus;
      title: string;
      phaseType: BattlePhaseType;
      scheduledAt: Date;
    }[];
  } | null;
};

type ListFlags = {
  channelNameSnapshot: boolean;
  templateEventDuration: boolean;
  sessionIsPaused: boolean;
};

function buildRunListSelect(flags: ListFlags): Prisma.ManagedEventRunSelect {
  return {
    id: true,
    guildSettingsId: true,
    templateId: true,
    channelId: true,
    ...(flags.channelNameSnapshot ? { channelNameSnapshot: true } : {}),
    scheduledAt: true,
    status: true,
    battleSessionId: true,
    errorMessage: true,
    completedAt: true,
    createdAt: true,
    updatedAt: true,
    guild: { select: { discordGuildId: true } },
    template: {
      select: {
        name: true,
        ...(flags.templateEventDuration ? { eventDurationMinutes: true } : {}),
        _count: { select: { events: true } },
      },
    },
    session: {
      select: {
        id: true,
        startedAt: true,
        ...(flags.sessionIsPaused ? { isPaused: true } : {}),
        reminders: {
          orderBy: { scheduledAt: "asc" },
          take: 200,
          select: {
            status: true,
            title: true,
            phaseType: true,
            scheduledAt: true,
          },
        },
      },
    },
  };
}

function normalizeListRow(
  r: Record<string, unknown>,
  flags: ListFlags,
): ManagedRunListRow {
  const tpl = r.template as {
    name: string;
    eventDurationMinutes?: number;
    _count: { events: number };
  };
  const sess = r.session as null | {
    id: string;
    startedAt: Date;
    isPaused?: boolean;
    reminders: {
      status: ReminderStatus;
      title: string;
      phaseType: BattlePhaseType;
      scheduledAt: Date;
    }[];
  };
  return {
    id: r.id as string,
    guildSettingsId: r.guildSettingsId as string,
    templateId: r.templateId as string,
    channelId: r.channelId as string,
    channelNameSnapshot: flags.channelNameSnapshot
      ? ((r.channelNameSnapshot as string | null) ?? null)
      : null,
    scheduledAt: r.scheduledAt as Date,
    status: r.status as ManagedEventStatus,
    battleSessionId: r.battleSessionId as string | null,
    errorMessage: r.errorMessage as string | null,
    completedAt: r.completedAt as Date | null,
    createdAt: r.createdAt as Date,
    updatedAt: r.updatedAt as Date,
    guild: r.guild as { discordGuildId: string },
    template: {
      name: tpl.name,
      eventDurationMinutes: flags.templateEventDuration
        ? (tpl.eventDurationMinutes ?? 60)
        : 60,
      _count: tpl._count,
    },
    session: sess
      ? {
          id: sess.id,
          startedAt: sess.startedAt,
          isPaused: flags.sessionIsPaused ? Boolean(sess.isPaused) : false,
          reminders: sess.reminders,
        }
      : null,
  };
}

function p2022Blob(e: Prisma.PrismaClientKnownRequestError): string {
  return `${e.message} ${JSON.stringify(e.meta ?? {})}`;
}

/**
 * Charge les runs pour /dashboard/runs en tolérant une base pas à jour
 * (colonnes optionnelles selon les migrations).
 */
export async function fetchManagedRunsForList(): Promise<ManagedRunListRow[]> {
  let channelNameSnapshot = true;
  let templateEventDuration = true;
  let sessionIsPaused = true;

  for (let attempt = 0; attempt < 12; attempt++) {
    const flags: ListFlags = {
      channelNameSnapshot,
      templateEventDuration,
      sessionIsPaused,
    };
    try {
      const raw = await prisma.managedEventRun.findMany({
        orderBy: { createdAt: "desc" },
        take: 200,
        select: buildRunListSelect(flags),
      });
      return raw.map((row) =>
        normalizeListRow(row as unknown as Record<string, unknown>, flags),
      );
    } catch (e) {
      if (!(e instanceof Prisma.PrismaClientKnownRequestError)) throw e;
      if (e.code !== "P2022") throw e;
      const blob = p2022Blob(e);
      if (/channelNameSnapshot/i.test(blob)) channelNameSnapshot = false;
      else if (/eventDurationMinutes/i.test(blob)) templateEventDuration = false;
      else if (/isPaused/i.test(blob)) sessionIsPaused = false;
      else throw e;
    }
  }
  throw new Error(
    "[kingshot] Impossible de charger les exécutions : migrations Prisma incomplètes.",
  );
}

export type ManagedRunDetailRow = {
  id: string;
  guildSettingsId: string;
  templateId: string;
  channelId: string;
  channelNameSnapshot: string | null;
  scheduledAt: Date;
  status: ManagedEventStatus;
  battleSessionId: string | null;
  errorMessage: string | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  guild: { discordGuildId: string };
  template: {
    name: string;
    eventDurationMinutes: number;
    events: { offsetSeconds: number; title: string; phaseType: BattlePhaseType }[];
  };
  session: {
    id: string;
    startedAt: Date;
    isPaused: boolean;
    reminders: {
      id: string;
      status: ReminderStatus;
      title: string;
      phaseType: BattlePhaseType;
      scheduledAt: Date;
      objective: string;
      action: string;
    }[];
  } | null;
  logs: { id: string; level: string; message: string; createdAt: Date }[];
};

type DetailFlags = ListFlags & { logs: boolean };

function buildRunDetailSelect(flags: DetailFlags): Prisma.ManagedEventRunSelect {
  return {
    id: true,
    guildSettingsId: true,
    templateId: true,
    channelId: true,
    ...(flags.channelNameSnapshot ? { channelNameSnapshot: true } : {}),
    scheduledAt: true,
    status: true,
    battleSessionId: true,
    errorMessage: true,
    completedAt: true,
    createdAt: true,
    updatedAt: true,
    guild: { select: { discordGuildId: true } },
    template: {
      select: {
        name: true,
        ...(flags.templateEventDuration ? { eventDurationMinutes: true } : {}),
        events: {
          orderBy: [{ offsetSeconds: "asc" }, { orderIndex: "asc" }],
          select: {
            offsetSeconds: true,
            title: true,
            phaseType: true,
          },
        },
      },
    },
    session: {
      select: {
        id: true,
        startedAt: true,
        ...(flags.sessionIsPaused ? { isPaused: true } : {}),
        reminders: {
          orderBy: { scheduledAt: "asc" },
          take: 120,
          select: {
            id: true,
            status: true,
            title: true,
            phaseType: true,
            scheduledAt: true,
            objective: true,
            action: true,
          },
        },
      },
    },
    ...(flags.logs
      ? {
          logs: {
            orderBy: { createdAt: "asc" },
            take: 200,
            select: {
              id: true,
              level: true,
              message: true,
              createdAt: true,
            },
          },
        }
      : {}),
  };
}

function normalizeDetailRow(
  r: Record<string, unknown>,
  flags: DetailFlags,
): ManagedRunDetailRow {
  const tpl = r.template as {
    name: string;
    eventDurationMinutes?: number;
    events: ManagedRunDetailRow["template"]["events"];
  };
  const sess = r.session as null | {
    id: string;
    startedAt: Date;
    isPaused?: boolean;
    reminders: {
      id: string;
      status: ReminderStatus;
      title: string;
      phaseType: BattlePhaseType;
      scheduledAt: Date;
      objective: string;
      action: string;
    }[];
  };
  return {
    id: r.id as string,
    guildSettingsId: r.guildSettingsId as string,
    templateId: r.templateId as string,
    channelId: r.channelId as string,
    channelNameSnapshot: flags.channelNameSnapshot
      ? ((r.channelNameSnapshot as string | null) ?? null)
      : null,
    scheduledAt: r.scheduledAt as Date,
    status: r.status as ManagedEventStatus,
    battleSessionId: r.battleSessionId as string | null,
    errorMessage: r.errorMessage as string | null,
    completedAt: r.completedAt as Date | null,
    createdAt: r.createdAt as Date,
    updatedAt: r.updatedAt as Date,
    guild: r.guild as { discordGuildId: string },
    template: {
      name: tpl.name,
      eventDurationMinutes: flags.templateEventDuration
        ? (tpl.eventDurationMinutes ?? 60)
        : 60,
      events: tpl.events ?? [],
    },
    session: sess
      ? {
          id: sess.id,
          startedAt: sess.startedAt,
          isPaused: flags.sessionIsPaused ? Boolean(sess.isPaused) : false,
          reminders: sess.reminders,
        }
      : null,
    logs: flags.logs
      ? ((r.logs as ManagedRunDetailRow["logs"]) ?? [])
      : [],
  };
}

export async function fetchManagedRunForDetailPage(
  id: string,
): Promise<ManagedRunDetailRow | null> {
  let channelNameSnapshot = true;
  let templateEventDuration = true;
  let sessionIsPaused = true;
  let logs = true;

  for (let attempt = 0; attempt < 16; attempt++) {
    const flags: DetailFlags = {
      channelNameSnapshot,
      templateEventDuration,
      sessionIsPaused,
      logs,
    };
    try {
      const raw = await prisma.managedEventRun.findUnique({
        where: { id },
        select: buildRunDetailSelect(flags),
      });
      if (!raw) return null;
      return normalizeDetailRow(
        raw as unknown as Record<string, unknown>,
        flags,
      );
    } catch (e) {
      if (!(e instanceof Prisma.PrismaClientKnownRequestError)) throw e;
      const blob = p2022Blob(e);
      const code = e.code;
      if (code === "P2022") {
        if (/channelNameSnapshot/i.test(blob)) channelNameSnapshot = false;
        else if (/eventDurationMinutes/i.test(blob)) templateEventDuration = false;
        else if (/isPaused/i.test(blob)) sessionIsPaused = false;
        else throw e;
        continue;
      }
      if (
        (code === "P2021" || code === "P2010") &&
        /ManagedEventRunLog|run.?log/i.test(blob)
      ) {
        logs = false;
        continue;
      }
      throw e;
    }
  }
  throw new Error(
    "[kingshot] Impossible de charger l’exécution : schéma base incompatible.",
  );
}
