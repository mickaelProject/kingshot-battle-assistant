import {
  BattleSessionStatus,
  ReminderStatus,
} from "@prisma/client";
import type { ChatInputCommandInteraction } from "discord.js";
import { buildBattleStartConfirmationEmbed } from "../../discord/tactical-announcement.js";
import { prisma } from "../../db/prisma.js";
import { startBattleForGuild } from "../../services/battle-start-executor.js";
import {
  armPendingRemindersForSession,
  endSession,
  getActiveSession,
} from "../../services/battle-session-service.js";
import { findTemplateForBattleStart } from "../../services/battle-template-service.js";
import { getGuildSettingsById } from "../../services/guild-settings-service.js";
import type { ReminderScheduler } from "../../services/reminder-scheduling-service.js";
import { log } from "../../util/log.js";
import { replyEphemeral, replyEphemeralEmbeds } from "../util.js";

export async function handleBattle(
  interaction: ChatInputCommandInteraction,
  guildSettingsId: string,
  scheduler: ReminderScheduler,
): Promise<void> {
  const sub = interaction.options.getSubcommand();
  const gs = await getGuildSettingsById(guildSettingsId);

  if (sub === "status") {
    const session = await getActiveSession(guildSettingsId);
    if (!session) {
      await replyEphemeral(interaction, "No battle running.");
      return;
    }
    const next = session.reminders[0];
    const lines = [
      `**${session.template.name}** · <#${session.channelId}>`,
      session.isPaused
        ? "⏸ **Paused** — timers cleared. `/battle resume` to continue."
        : "▶ Running",
      next
        ? `Next <t:${Math.floor(next.scheduledAt.getTime() / 1000)}:R> · **${next.phaseType}** · ${next.title}`
        : "No queued phases.",
    ];
    await replyEphemeral(interaction, lines.join("\n"));
    return;
  }

  if (sub === "stop") {
    const session = await getActiveSession(guildSettingsId);
    if (!session) {
      await replyEphemeral(interaction, "No battle to stop.");
      return;
    }
    scheduler.cancelForSession(session.id);
    await endSession(session.id, BattleSessionStatus.ENDED);
    await replyEphemeral(interaction, "Battle stopped. Pending pings cleared.");
    return;
  }

  if (sub === "pause") {
    const session = await getActiveSession(guildSettingsId);
    if (!session) {
      await replyEphemeral(interaction, "No active battle to pause.");
      return;
    }
    if (session.isPaused) {
      await replyEphemeral(interaction, "Already paused. Use `/battle resume`.");
      return;
    }
    await prisma.battleSession.update({
      where: { id: session.id },
      data: { isPaused: true },
    });
    scheduler.cancelForSession(session.id);
    await replyEphemeral(
      interaction,
      "Battle **paused**. Timers cleared; pending phases stay in queue. `/battle resume` when ready.",
    );
    return;
  }

  if (sub === "resume") {
    const session = await getActiveSession(guildSettingsId);
    if (!session) {
      await replyEphemeral(interaction, "No active battle.");
      return;
    }
    if (!session.isPaused) {
      await replyEphemeral(interaction, "Battle is not paused.");
      return;
    }
    await prisma.battleSession.update({
      where: { id: session.id },
      data: { isPaused: false },
    });
    await armPendingRemindersForSession(session.id, scheduler);
    await replyEphemeral(
      interaction,
      "Battle **resumed**. Pending phases re-armed from their scheduled times.",
    );
    return;
  }

  if (sub === "next-event") {
    const session = await getActiveSession(guildSettingsId);
    if (!session) {
      await replyEphemeral(interaction, "No active battle.");
      return;
    }
    if (session.isPaused) {
      await replyEphemeral(
        interaction,
        "Battle is paused. `/battle resume` first.",
      );
      return;
    }
    const next = await prisma.battleReminder.findFirst({
      where: { sessionId: session.id, status: ReminderStatus.PENDING },
      orderBy: { scheduledAt: "asc" },
    });
    if (!next) {
      await replyEphemeral(interaction, "No pending phases left.");
      return;
    }
    const now = new Date();
    await prisma.battleReminder.update({
      where: { id: next.id },
      data: { scheduledAt: now },
    });
    scheduler.cancelReminder(session.id, next.id);
    scheduler.scheduleReminder({
      sessionId: session.id,
      reminderId: next.id,
      channelId: session.channelId,
      fireAt: now,
    });
    await replyEphemeral(
      interaction,
      `Next phase **${next.title}** (${next.phaseType}) fired to the feed now.`,
    );
    return;
  }

  if (sub === "phase-now") {
    const session = await getActiveSession(guildSettingsId);
    if (!session) {
      await replyEphemeral(interaction, "No active battle.");
      return;
    }
    if (session.isPaused) {
      await replyEphemeral(
        interaction,
        "Battle is paused. `/battle resume` first.",
      );
      return;
    }
    const phaseKey = interaction.options.getString("phase_key", true).trim();
    const def = await prisma.battleEventDefinition.findFirst({
      where: { templateId: session.templateId, key: phaseKey },
      select: { id: true },
    });
    if (!def) {
      await replyEphemeral(
        interaction,
        `No phase with key \`${phaseKey}\` in this template.`,
      );
      return;
    }
    const reminder = await prisma.battleReminder.findFirst({
      where: {
        sessionId: session.id,
        eventDefinitionId: def.id,
        status: ReminderStatus.PENDING,
      },
      select: { id: true, title: true, phaseType: true },
    });
    if (!reminder) {
      await replyEphemeral(
        interaction,
        "That phase is not pending (already sent or skipped).",
      );
      return;
    }
    const pushed = await scheduler.forceDeliverReminder(reminder.id);
    if (!pushed.ok) {
      await replyEphemeral(interaction, pushed.error);
      return;
    }
    await replyEphemeral(
      interaction,
      `Posted **${reminder.title}** (${reminder.phaseType}) → <#${session.channelId}>.`,
    );
    return;
  }

  if (sub !== "start") return;

  const existing = await getActiveSession(guildSettingsId);
  if (existing) {
    await replyEphemeral(
      interaction,
      "A battle is already active. Use `/battle stop` first.",
    );
    return;
  }

  if (!gs.battleChannelId) {
    await replyEphemeral(
      interaction,
      "No battle channel set. Run `/setup channel` and pick the feed channel.",
    );
    return;
  }

  const override =
    interaction.options.getString("template")?.trim() || null;
  const template = await findTemplateForBattleStart(
    guildSettingsId,
    gs.defaultTemplateId,
    override,
  );

  if (!template) {
    const hint = override
      ? `No template named **${override}**. Check spelling or \`/template list\`.`
      : "No default template. Use `/template default` or pass `template` on `/battle start`.";
    await replyEphemeral(interaction, hint);
    return;
  }

  if (template.events.length === 0) {
    await replyEphemeral(
      interaction,
      "This template has no phases. Add some with `/template event_add` first.",
    );
    return;
  }

  const started = await startBattleForGuild({
    guildSettingsId,
    templateId: template.id,
    channelId: gs.battleChannelId,
    starterUserId: interaction.user.id,
    scheduler,
  });

  if (!started.ok) {
    if (started.reason === "ACTIVE_EXISTS") {
      await replyEphemeral(
        interaction,
        "A battle is already active. Use `/battle stop` first.",
      );
      return;
    }
    if (started.reason === "INVALID_DATA") {
      await replyEphemeral(
        interaction,
        "Template data error: check phase titles and offsets in the admin or database.",
      );
      return;
    }
    await replyEphemeral(
      interaction,
      "Could not start battle. Check template and try again.",
    );
    return;
  }

  log.info("battle", "timers armed", { count: started.phaseCount });

  const confirm = buildBattleStartConfirmationEmbed({
    templateName: template.name,
    channelMention: `<#${gs.battleChannelId}>`,
    phaseCount: started.phaseCount,
  });
  await replyEphemeralEmbeds(interaction, [confirm]);
}
