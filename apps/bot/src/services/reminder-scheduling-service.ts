import {
  BattleSessionStatus,
  ReminderStatus,
} from "@prisma/client";
import type { Client } from "discord.js";
import { buildTacticalPhaseEmbed } from "../discord/tactical-announcement.js";
import { prisma } from "../db/prisma.js";
import { log } from "../util/log.js";
import { translateTacticalFieldsToEn } from "../util/translate-to-en.js";

type Scheduled = { timeout: NodeJS.Timeout; reminderId: string };

/**
 * MVP reminder engine (single process). Delivers **structured tactical embeds**
 * from snapshot fields on `BattleReminder`.
 *
 * **Hydration (bot restart):**
 * - Only rows in `PENDING` are scheduled. `SENT` / `SKIPPED` are never re-queued.
 * - `PROCESSING` rows (crash mid-delivery) for ACTIVE sessions reset to `PENDING`.
 *
 * **Overdue `PENDING`:** `delay <= 0` → deliver immediately; same after hydrate.
 *
 * **Idempotency:** `PENDING` → `PROCESSING` via `updateMany` before send.
 */
export class ReminderScheduler {
  private readonly client: Client;
  private readonly scheduled = new Map<string, Scheduled>();

  constructor(client: Client) {
    this.client = client;
  }

  clearAll(): void {
    for (const { timeout } of this.scheduled.values()) clearTimeout(timeout);
    this.scheduled.clear();
  }

  cancelForSession(sessionId: string): void {
    const prefix = `${sessionId}:`;
    const keys = [...this.scheduled.keys()].filter((id) => id.startsWith(prefix));
    for (const id of keys) {
      const s = this.scheduled.get(id);
      if (s) {
        clearTimeout(s.timeout);
        this.scheduled.delete(id);
      }
    }
  }

  cancelReminder(sessionId: string, reminderId: string): void {
    const key = `${sessionId}:${reminderId}`;
    const existing = this.scheduled.get(key);
    if (existing) clearTimeout(existing.timeout);
    this.scheduled.delete(key);
  }

  scheduleReminder(params: {
    sessionId: string;
    reminderId: string;
    channelId: string;
    fireAt: Date;
  }): void {
    const key = `${params.sessionId}:${params.reminderId}`;
    const existing = this.scheduled.get(key);
    if (existing) clearTimeout(existing.timeout);

    const delay = params.fireAt.getTime() - Date.now();
    const run = async () => {
      this.scheduled.delete(key);
      await this.deliver(params.channelId, params.reminderId);
    };

    if (delay <= 0) {
      void run();
      return;
    }

    const timeout = setTimeout(() => void run(), delay);
    this.scheduled.set(key, { timeout, reminderId: params.reminderId });
  }

  /**
   * Sends one pending reminder immediately (manual / emergency).
   */
  async forceDeliverReminder(
    reminderId: string,
  ): Promise<{ ok: true } | { ok: false; error: string }> {
    const row = await prisma.battleReminder.findUnique({
      where: { id: reminderId },
      include: { session: true },
    });
    if (!row) return { ok: false, error: "Reminder not found." };
    if (row.session.status !== BattleSessionStatus.ACTIVE) {
      return { ok: false, error: "No active battle for this reminder." };
    }
    if (row.session.isPaused) {
      return { ok: false, error: "Battle is paused. Use `/battle resume` first." };
    }
    if (row.status !== ReminderStatus.PENDING) {
      return {
        ok: false,
        error: "That phase is not pending (already sent or skipped).",
      };
    }
    this.cancelReminder(row.sessionId, reminderId);
    await this.deliver(row.session.channelId, reminderId);
    return { ok: true };
  }

  async hydrateFromDatabase(): Promise<void> {
    const reopened = await prisma.battleReminder.updateMany({
      where: {
        status: ReminderStatus.PROCESSING,
        session: { status: BattleSessionStatus.ACTIVE },
      },
      data: { status: ReminderStatus.PENDING },
    });
    if (reopened.count > 0) {
      log.warn("reminder", "reopened stale PROCESSING rows", {
        count: reopened.count,
      });
    }

    const pending = await prisma.battleReminder.findMany({
      where: { status: ReminderStatus.PENDING },
      include: { session: true },
    });

    let scheduled = 0;
    for (const r of pending) {
      if (r.session.status !== BattleSessionStatus.ACTIVE) continue;
      if (r.session.isPaused) continue;
      this.scheduleReminder({
        sessionId: r.sessionId,
        reminderId: r.id,
        channelId: r.session.channelId,
        fireAt: r.scheduledAt,
      });
      scheduled += 1;
    }
    log.info("reminder", "hydrate done", { pending: scheduled });
  }

  private async deliver(
    channelId: string,
    reminderId: string,
  ): Promise<void> {
    const row = await prisma.battleReminder.findUnique({
      where: { id: reminderId },
      select: { status: true },
    });
    if (!row) return;
    if (
      row.status === ReminderStatus.SENT ||
      row.status === ReminderStatus.SKIPPED
    ) {
      return;
    }
    if (row.status === ReminderStatus.PROCESSING) {
      return;
    }

    const claimed = await prisma.battleReminder.updateMany({
      where: { id: reminderId, status: ReminderStatus.PENDING },
      data: { status: ReminderStatus.PROCESSING },
    });
    if (claimed.count === 0) {
      log.info("reminder", "skip duplicate delivery", {
        id: reminderId.slice(0, 8),
      });
      return;
    }

    const payload = await prisma.battleReminder.findUnique({
      where: { id: reminderId },
      select: {
        sessionId: true,
        phaseType: true,
        title: true,
        objective: true,
        action: true,
        nextHint: true,
      },
    });
    if (!payload) {
      await prisma.battleReminder.updateMany({
        where: { id: reminderId, status: ReminderStatus.PROCESSING },
        data: { status: ReminderStatus.SKIPPED },
      });
      return;
    }

    const sessionRow = await prisma.battleSession.findUnique({
      where: { id: payload.sessionId },
      select: { isPaused: true, status: true },
    });
    if (
      sessionRow?.status !== BattleSessionStatus.ACTIVE ||
      sessionRow.isPaused
    ) {
      await prisma.battleReminder.updateMany({
        where: { id: reminderId, status: ReminderStatus.PROCESSING },
        data: { status: ReminderStatus.PENDING },
      });
      log.info("reminder", "delivery deferred (paused or inactive session)", {
        id: reminderId.slice(0, 8),
      });
      return;
    }

    let title = payload.title;
    let objective = payload.objective ?? "";
    let action = payload.action ?? "";
    let nextHint = payload.nextHint ?? "";
    try {
      const en = await translateTacticalFieldsToEn({
        title,
        objective,
        action,
        nextHint,
      });
      title = en.title;
      objective = en.objective;
      action = en.action;
      nextHint = en.nextHint;
    } catch {
      /* traduction optionnelle — envoi du texte brut */
    }

    const embed = buildTacticalPhaseEmbed({
      phaseType: payload.phaseType,
      title,
      objective: objective || undefined,
      action: action || undefined,
      nextHint: nextHint || undefined,
    });

    const channel = await this.client.channels.fetch(channelId);
    if (!channel?.isSendable()) {
      await prisma.battleReminder.updateMany({
        where: { id: reminderId, status: ReminderStatus.PROCESSING },
        data: { status: ReminderStatus.SKIPPED },
      });
      log.warn("reminder", "channel invalid, skipped", {
        id: reminderId.slice(0, 8),
        channelId,
      });
      return;
    }

    try {
      await channel.send({
        embeds: [embed],
        allowedMentions: { parse: [] },
      });
      const done = await prisma.battleReminder.updateMany({
        where: { id: reminderId, status: ReminderStatus.PROCESSING },
        data: { status: ReminderStatus.SENT, sentAt: new Date() },
      });
      if (done.count > 0) {
        log.info("reminder", "embed posted OK", {
          id: reminderId.slice(0, 8),
          channelId,
        });
      }
    } catch (err) {
      await prisma.battleReminder.updateMany({
        where: { id: reminderId, status: ReminderStatus.PROCESSING },
        data: { status: ReminderStatus.SKIPPED },
      });
      log.warn("reminder", "embed post failed, skipped", {
        id: reminderId.slice(0, 8),
        channelId,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
}
