import {
  type BattlePhaseType,
  BattleSessionStatus,
  ManagedEventStatus,
  Prisma,
  ReminderStatus,
  type TimelineScope,
} from "@prisma/client";
import { prisma } from "../db/prisma.js";
import {
  allianceClockOffsetSeconds,
  assertIntegerNonNegativeOffsets,
  assertPhaseHasDisplayableContent,
  isDiscordTimelineScope,
  legionPhaseTitlePrefix,
  type LegionAnchorTemplate,
} from "../domain/battle-rules.js";
import { log } from "../util/log.js";
import type { ReminderScheduler } from "./reminder-scheduling-service.js";

const battleEventOrderBy: Prisma.BattleEventDefinitionOrderByWithRelationInput[] =
  [{ offsetSeconds: "asc" }, { orderIndex: "asc" }];

export async function getActiveSession(guildSettingsId: string) {
  return prisma.battleSession.findFirst({
    where: { guildId: guildSettingsId, status: BattleSessionStatus.ACTIVE },
    include: {
      template: { include: { events: { orderBy: battleEventOrderBy } } },
      reminders: {
        where: { status: ReminderStatus.PENDING },
        orderBy: { scheduledAt: "asc" },
        take: 8,
      },
    },
  });
}

/** Stops session: pending + in-flight delivery claims are cleared. */
export async function cancelPendingReminders(sessionId: string) {
  const r = await prisma.battleReminder.updateMany({
    where: {
      sessionId,
      status: { in: [ReminderStatus.PENDING, ReminderStatus.PROCESSING] },
    },
    data: { status: ReminderStatus.SKIPPED },
  });
  log.info("reminder", "cancelled pending/processing", {
    sessionId,
    count: r.count,
  });
}

export async function endSession(
  sessionId: string,
  status: BattleSessionStatus,
) {
  await cancelPendingReminders(sessionId);
  await prisma.battleSession.update({
    where: { id: sessionId },
    data: { status, endedAt: new Date(), isPaused: false },
  });

  await prisma.managedEventRun.updateMany({
    where: {
      battleSessionId: sessionId,
      status: ManagedEventStatus.ACTIVE,
    },
    data: {
      status: ManagedEventStatus.COMPLETED,
      completedAt: new Date(),
    },
  });

  log.info("battle", "session ended", {
    sessionId: sessionId.slice(0, 12),
    status: String(status),
  });
}

export type CreatedReminderSchedule = {
  reminderId: string;
  sessionId: string;
  channelId: string;
  fireAt: Date;
};

export class ActiveBattleSessionExistsError extends Error {
  constructor() {
    super("ACTIVE_BATTLE_EXISTS");
    this.name = "ActiveBattleSessionExistsError";
  }
}

/**
 * Creates one BattleReminder per template phase (snapshot for delivery).
 * Enforces one ACTIVE session per guild (DB partial unique + transaction pre-check).
 */
export async function createBattleSessionWithReminders(params: {
  guildSettingsId: string;
  templateId: string;
  channelId: string;
  starterUserId: string;
  events: Array<{
    id: string;
    offsetSeconds: number;
    orderIndex?: number;
    phaseType: BattlePhaseType;
    title: string;
    objective?: string;
    action?: string;
    nextHint?: string;
    timelineScope: TimelineScope;
  }>;
  legionAnchor: LegionAnchorTemplate;
}): Promise<CreatedReminderSchedule[]> {
  const prepared = params.events
    .filter((e) => isDiscordTimelineScope(e.timelineScope))
    .map((e) => {
      const allianceOffsetSeconds = allianceClockOffsetSeconds(
        e.offsetSeconds,
        e.timelineScope,
        params.legionAnchor,
      );
      const prefix = legionPhaseTitlePrefix(e.timelineScope);
      return {
        id: e.id,
        orderIndex: e.orderIndex,
        phaseType: e.phaseType,
        title: `${prefix}${e.title}`,
        objective: e.objective ?? "",
        action: e.action ?? "",
        nextHint: e.nextHint ?? "",
        allianceOffsetSeconds,
      };
    });
  assertIntegerNonNegativeOffsets(
    prepared.map((e) => ({ offsetSeconds: e.allianceOffsetSeconds })),
  );
  assertPhaseHasDisplayableContent(prepared);
  const events = [...prepared].sort((a, b) => {
    if (a.allianceOffsetSeconds !== b.allianceOffsetSeconds) {
      return a.allianceOffsetSeconds - b.allianceOffsetSeconds;
    }
    return (a.orderIndex ?? 0) - (b.orderIndex ?? 0);
  });
  const startedAt = new Date();

  return prisma.$transaction(async (tx) => {
    const active = await tx.battleSession.findFirst({
      where: {
        guildId: params.guildSettingsId,
        status: BattleSessionStatus.ACTIVE,
      },
      select: { id: true },
    });
    if (active) throw new ActiveBattleSessionExistsError();

    const session = await tx.battleSession.create({
      data: {
        guildId: params.guildSettingsId,
        templateId: params.templateId,
        channelId: params.channelId,
        starterUserId: params.starterUserId,
        startedAt,
        status: BattleSessionStatus.ACTIVE,
      },
    });

    const schedules: CreatedReminderSchedule[] = [];

    for (const ev of events) {
      const scheduledAt = new Date(
        startedAt.getTime() + ev.allianceOffsetSeconds * 1000,
      );
      const reminder = await tx.battleReminder.create({
        data: {
          sessionId: session.id,
          scheduledAt,
          eventDefinitionId: ev.id,
          phaseType: ev.phaseType,
          title: ev.title,
          objective: ev.objective ?? "",
          action: ev.action ?? "",
          nextHint: ev.nextHint ?? "",
          status: ReminderStatus.PENDING,
        },
      });
      schedules.push({
        reminderId: reminder.id,
        sessionId: session.id,
        channelId: session.channelId,
        fireAt: scheduledAt,
      });
    }

    log.info("battle", "session started", {
      sessionId: session.id.slice(0, 8),
      reminders: schedules.length,
    });

    return schedules;
  });
}

/** Re-arms PENDING reminders after `/battle resume` (session must be active, not paused). */
export async function armPendingRemindersForSession(
  sessionId: string,
  scheduler: ReminderScheduler,
): Promise<void> {
  const pending = await prisma.battleReminder.findMany({
    where: { sessionId, status: ReminderStatus.PENDING },
    orderBy: { scheduledAt: "asc" },
    include: { session: true },
  });
  for (const r of pending) {
    if (r.session.status !== BattleSessionStatus.ACTIVE || r.session.isPaused) {
      continue;
    }
    scheduler.scheduleReminder({
      sessionId: r.sessionId,
      reminderId: r.id,
      channelId: r.session.channelId,
      fireAt: r.scheduledAt,
    });
  }
  log.info("battle", "re-armed pending reminders", {
    sessionId: sessionId.slice(0, 8),
    count: pending.length,
  });
}
