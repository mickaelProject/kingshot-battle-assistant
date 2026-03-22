import type { Client } from "discord.js";
import { ManagedEventStatus } from "@prisma/client";
import { prisma } from "../db/prisma.js";
import { log } from "../util/log.js";
import { startBattleForGuild } from "./battle-start-executor.js";
import type { BattleStartFailureReason } from "./battle-start-executor.js";
import { verifyGuildTextChannelForManagedEvent } from "./managed-channel-verify.js";
import { appendManagedRunLog } from "./managed-run-log.js";
import type { ReminderScheduler } from "./reminder-scheduling-service.js";

const SYSTEM_STARTER = "0";

function mapBattleStartFailure(reason: BattleStartFailureReason): string {
  switch (reason) {
    case "ACTIVE_EXISTS":
      return "Guild already has an active battle.";
    case "NO_PHASES":
      return "Template has no phases.";
    case "GUILD_MISMATCH":
      return "Template does not belong to this guild.";
    case "TEMPLATE_NOT_FOUND":
      return "Template was not found.";
    case "INVALID_DATA":
      return "Invalid template data (offsets or phase content).";
    default:
      return "Battle could not be started.";
  }
}

/**
 * Picks due managed runs and starts battles on Discord (same path as /battle start).
 * Assumes a single bot process (no distributed lock).
 */
export async function processDueManagedEvents(
  client: Client,
  scheduler: ReminderScheduler,
): Promise<void> {
  const now = new Date();
  const due = await prisma.managedEventRun.findMany({
    where: {
      status: ManagedEventStatus.SCHEDULED,
      scheduledAt: { lte: now },
    },
    orderBy: { scheduledAt: "asc" },
    take: 5,
  });

  for (const run of due) {
    const fresh = await prisma.managedEventRun.findFirst({
      where: {
        id: run.id,
        status: ManagedEventStatus.SCHEDULED,
        scheduledAt: { lte: now },
      },
    });
    if (!fresh) continue;

    log.info("managed", "picked up scheduled run", {
      runId: run.id.slice(0, 8),
      guildSettingsId: run.guildSettingsId.slice(0, 8),
      templateId: run.templateId.slice(0, 8),
      channelId: run.channelId,
      scheduledAt: run.scheduledAt.toISOString(),
    });
    void appendManagedRunLog(
      run.id,
      "info",
      `Run dû · channel ${run.channelId} · scheduledAt ${run.scheduledAt.toISOString()}`,
    );

    const guildRow = await prisma.guildSettings.findUnique({
      where: { id: run.guildSettingsId },
      select: { discordGuildId: true },
    });
    if (!guildRow) {
      await prisma.managedEventRun.update({
        where: { id: run.id },
        data: {
          status: ManagedEventStatus.FAILED,
          errorMessage: "Guild settings row missing.",
        },
      });
      log.warn("managed", "guild row missing", { runId: run.id.slice(0, 8) });
      void appendManagedRunLog(
        run.id,
        "error",
        "Échec : ligne GuildSettings introuvable.",
      );
      continue;
    }

    const discordGuildId = guildRow.discordGuildId;
    log.info("managed", "resolving Discord channel", {
      runId: run.id.slice(0, 8),
      discordGuildId,
      channelId: run.channelId,
    });

    const channelCheck = await verifyGuildTextChannelForManagedEvent(
      client,
      discordGuildId,
      run.channelId,
    );

    if (!channelCheck.ok) {
      await prisma.managedEventRun.update({
        where: { id: run.id },
        data: {
          status: ManagedEventStatus.FAILED,
          errorMessage: `${channelCheck.detail} (${channelCheck.reason})`,
        },
      });
      log.warn("managed", "channel verification failed", {
        runId: run.id.slice(0, 8),
        channelId: run.channelId,
        reason: channelCheck.reason,
        detail: channelCheck.detail,
      });
      void appendManagedRunLog(
        run.id,
        "warn",
        `Salon invalide ou inaccessible : ${channelCheck.detail} (${channelCheck.reason})`,
      );
      continue;
    }

    log.info("managed", "channel OK", {
      runId: run.id.slice(0, 8),
      channelId: run.channelId,
      channelName: channelCheck.channelName,
    });
    void appendManagedRunLog(
      run.id,
      "info",
      `Salon OK · #${channelCheck.channelName} (${run.channelId})`,
    );

    const locked = await prisma.managedEventRun.updateMany({
      where: { id: run.id, status: ManagedEventStatus.SCHEDULED },
      data: { status: ManagedEventStatus.STARTING },
    });
    if (locked.count === 0) continue;
    void appendManagedRunLog(run.id, "info", "Statut → STARTING (création session…).");

    let result: Awaited<ReturnType<typeof startBattleForGuild>>;
    try {
      result = await startBattleForGuild({
        guildSettingsId: run.guildSettingsId,
        templateId: run.templateId,
        channelId: run.channelId,
        starterUserId: SYSTEM_STARTER,
        scheduler,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await prisma.managedEventRun.update({
        where: { id: run.id },
        data: {
          status: ManagedEventStatus.FAILED,
          errorMessage: `Unexpected error while starting battle: ${msg}`,
        },
      });
      log.warn("managed", "startBattleForGuild threw", {
        runId: run.id.slice(0, 8),
        message: msg,
      });
      void appendManagedRunLog(run.id, "error", `Exception startBattle : ${msg}`);
      continue;
    }

    if (!result.ok) {
      const msg = mapBattleStartFailure(result.reason);
      await prisma.managedEventRun.update({
        where: { id: run.id },
        data: {
          status: ManagedEventStatus.FAILED,
          errorMessage: msg,
        },
      });
      log.warn("managed", "launch failed", {
        runId: run.id.slice(0, 8),
        reason: result.reason,
      });
      void appendManagedRunLog(
        run.id,
        "error",
        `Lancement refusé : ${mapBattleStartFailure(result.reason)}`,
      );
      continue;
    }

    await prisma.managedEventRun.update({
      where: { id: run.id },
      data: {
        battleSessionId: result.sessionId,
        status: ManagedEventStatus.ACTIVE,
      },
    });

    log.info("managed", "event started (session active, reminders armed)", {
      runId: run.id.slice(0, 8),
      sessionId: result.sessionId.slice(0, 8),
      channelId: run.channelId,
      phases: result.phaseCount,
    });
    void appendManagedRunLog(
      run.id,
      "info",
      `ACTIVE · session ${result.sessionId.slice(0, 8)}… · ${result.phaseCount} phase(s) armée(s)`,
    );
  }
}
