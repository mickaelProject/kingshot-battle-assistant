import {
  BattleSessionStatus,
  ManagedEventStatus,
  ReminderStatus,
} from "@prisma/client";
import { prisma } from "../db/prisma.js";
import { log } from "../util/log.js";
import {
  armPendingRemindersForSession,
  cancelPendingReminders,
} from "./battle-session-service.js";
import { appendManagedRunLog } from "./managed-run-log.js";
import type { ReminderScheduler } from "./reminder-scheduling-service.js";

async function loadActiveManagedRun(runId: string) {
  return prisma.managedEventRun.findFirst({
    where: {
      id: runId,
      status: ManagedEventStatus.ACTIVE,
      battleSessionId: { not: null },
    },
    include: { session: true },
  });
}

export type RunControlResult =
  | { ok: true }
  | { ok: false; error: string };

export async function controlPauseRun(
  runId: string,
  scheduler: ReminderScheduler,
): Promise<RunControlResult> {
  const run = await loadActiveManagedRun(runId);
  if (!run?.session || !run.battleSessionId) {
    return { ok: false, error: "Run introuvable ou sans session active." };
  }
  const session = run.session;
  if (session.status !== BattleSessionStatus.ACTIVE) {
    return { ok: false, error: "La session n’est plus active." };
  }
  if (session.isPaused) {
    return { ok: false, error: "La bataille est déjà en pause." };
  }

  await prisma.battleSession.update({
    where: { id: session.id },
    data: { isPaused: true },
  });
  scheduler.cancelForSession(session.id);
  await appendManagedRunLog(
    runId,
    "info",
    "Run mis en pause par l’admin (plus de timers armés).",
  );
  log.info("run-control", "pause", { runId: runId.slice(0, 8) });
  return { ok: true };
}

export async function controlResumeRun(
  runId: string,
  scheduler: ReminderScheduler,
): Promise<RunControlResult> {
  const run = await loadActiveManagedRun(runId);
  if (!run?.session || !run.battleSessionId) {
    return { ok: false, error: "Run introuvable ou sans session active." };
  }
  const session = run.session;
  if (session.status !== BattleSessionStatus.ACTIVE) {
    return { ok: false, error: "La session n’est plus active." };
  }
  if (!session.isPaused) {
    return { ok: false, error: "La bataille n’est pas en pause." };
  }

  await prisma.battleSession.update({
    where: { id: session.id },
    data: { isPaused: false },
  });
  await armPendingRemindersForSession(session.id, scheduler);
  await appendManagedRunLog(
    runId,
    "info",
    "Run repris par l’admin (rappels réarmés).",
  );
  log.info("run-control", "resume", { runId: runId.slice(0, 8) });
  return { ok: true };
}

export async function controlStopRun(
  runId: string,
  scheduler: ReminderScheduler,
): Promise<RunControlResult> {
  const run = await loadActiveManagedRun(runId);
  if (!run?.session || !run.battleSessionId) {
    return { ok: false, error: "Run introuvable ou sans session active." };
  }
  const session = run.session;
  if (session.status !== BattleSessionStatus.ACTIVE) {
    return { ok: false, error: "La session n’est plus active." };
  }

  scheduler.cancelForSession(session.id);
  await cancelPendingReminders(session.id);
  await prisma.battleSession.update({
    where: { id: session.id },
    data: {
      status: BattleSessionStatus.ENDED,
      endedAt: new Date(),
      isPaused: false,
    },
  });
  await prisma.managedEventRun.updateMany({
    where: { id: runId, status: ManagedEventStatus.ACTIVE },
    data: {
      status: ManagedEventStatus.CANCELLED,
      completedAt: new Date(),
    },
  });
  await appendManagedRunLog(
    runId,
    "info",
    "Run arrêté manuellement par l’admin (session terminée, phases en attente ignorées).",
  );
  log.info("run-control", "stop", { runId: runId.slice(0, 8) });
  return { ok: true };
}

export async function controlTriggerNextPhase(
  runId: string,
  scheduler: ReminderScheduler,
): Promise<RunControlResult> {
  const run = await loadActiveManagedRun(runId);
  if (!run?.session || !run.battleSessionId) {
    return { ok: false, error: "Run introuvable ou sans session active." };
  }
  const session = run.session;
  if (session.status !== BattleSessionStatus.ACTIVE) {
    return { ok: false, error: "La session n’est plus active." };
  }
  if (session.isPaused) {
    return {
      ok: false,
      error: "Reprends la bataille avant de forcer une phase.",
    };
  }

  const next = await prisma.battleReminder.findFirst({
    where: { sessionId: session.id, status: ReminderStatus.PENDING },
    orderBy: { scheduledAt: "asc" },
  });
  if (!next) {
    return { ok: false, error: "Aucune phase en attente." };
  }

  const pushed = await scheduler.forceDeliverReminder(next.id);
  if (!pushed.ok) {
    return { ok: false, error: pushed.error };
  }

  const label = next.title?.trim() || String(next.phaseType);
  await appendManagedRunLog(
    runId,
    "info",
    `Phase déclenchée manuellement par l’admin · ${label}`,
  );
  log.info("run-control", "next-phase", {
    runId: runId.slice(0, 8),
    reminderId: next.id.slice(0, 8),
  });
  return { ok: true };
}
