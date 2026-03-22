import { Prisma } from "@prisma/client";
import type { ReminderScheduler } from "./reminder-scheduling-service.js";
import {
  ActiveBattleSessionExistsError,
  createBattleSessionWithReminders,
} from "./battle-session-service.js";
import { prisma } from "../db/prisma.js";
import { isDiscordTimelineScope } from "../domain/battle-rules.js";

const battleEventOrderBy: Prisma.BattleEventDefinitionOrderByWithRelationInput[] =
  [{ offsetSeconds: "asc" }, { orderIndex: "asc" }];

export type BattleStartFailureReason =
  | "ACTIVE_EXISTS"
  | "NO_PHASES"
  | "TEMPLATE_NOT_FOUND"
  | "GUILD_MISMATCH"
  | "INVALID_DATA";

/** Shared path for `/battle start` and autonomous managed runs. */
export async function startBattleForGuild(params: {
  guildSettingsId: string;
  templateId: string;
  channelId: string;
  starterUserId: string;
  scheduler: ReminderScheduler;
}): Promise<
  | { ok: true; sessionId: string; phaseCount: number }
  | { ok: false; reason: BattleStartFailureReason }
> {
  const template = await prisma.battleTemplate.findUnique({
    where: { id: params.templateId },
    include: { events: { orderBy: battleEventOrderBy } },
  });

  if (!template) {
    return { ok: false, reason: "TEMPLATE_NOT_FOUND" };
  }
  if (template.guildId !== params.guildSettingsId) {
    return { ok: false, reason: "GUILD_MISMATCH" };
  }

  const discordEvents = template.events.filter((e) =>
    isDiscordTimelineScope(e.timelineScope),
  );
  if (discordEvents.length === 0) {
    return { ok: false, reason: "NO_PHASES" };
  }

  try {
    const schedules = await createBattleSessionWithReminders({
      guildSettingsId: params.guildSettingsId,
      templateId: template.id,
      channelId: params.channelId,
      starterUserId: params.starterUserId,
      legionAnchor: {
        legion1StartOffsetMinutes: template.legion1StartOffsetMinutes ?? 0,
        legion2StartOffsetMinutes: template.legion2StartOffsetMinutes ?? 0,
      },
      events: discordEvents.map((e) => ({
        id: e.id,
        offsetSeconds: e.offsetSeconds,
        orderIndex: e.orderIndex,
        phaseType: e.phaseType,
        title: e.title,
        objective: e.objective,
        action: e.action,
        nextHint: e.nextHint,
        timelineScope: e.timelineScope,
      })),
    });

    for (const s of schedules) {
      params.scheduler.scheduleReminder({
        sessionId: s.sessionId,
        reminderId: s.reminderId,
        channelId: s.channelId,
        fireAt: s.fireAt,
      });
    }

    return {
      ok: true,
      sessionId: schedules[0]?.sessionId ?? "",
      phaseCount: schedules.length,
    };
  } catch (e) {
    if (e instanceof ActiveBattleSessionExistsError) {
      return { ok: false, reason: "ACTIVE_EXISTS" };
    }
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2002"
    ) {
      return { ok: false, reason: "ACTIVE_EXISTS" };
    }
    if (
      e instanceof Error &&
      (e.message === "INVALID_EVENT_OFFSET" || e.message === "INVALID_PHASE_BODY")
    ) {
      return { ok: false, reason: "INVALID_DATA" };
    }
    throw e;
  }
}
