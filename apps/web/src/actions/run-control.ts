"use server";

import {
  BattleSessionStatus,
  ManagedEventStatus,
  Prisma,
  ReminderStatus,
} from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import {
  invokeBotRunControl,
  type InvokeBotRunControlResult,
} from "@/lib/bot-control";
import { prisma } from "@/lib/prisma";

async function appendRunLogSafe(
  runId: string,
  level: string,
  message: string,
) {
  try {
    await prisma.managedEventRunLog.create({
      data: { runId, level, message: message.slice(0, 2000) },
    });
  } catch {
    /* ignore */
  }
}

function redirectWithToast(path: string, ok: boolean, msg: string): never {
  const toast = ok ? "saved" : "error";
  const sep = path.includes("?") ? "&" : "?";
  redirect(
    `${path}${sep}toast=${toast}&toastMsg=${encodeURIComponent(msg)}`,
  );
}

type ControlFail = Extract<InvokeBotRunControlResult, { ok: false }>;

function isP2022IsPaused(e: unknown): boolean {
  return (
    e instanceof Prisma.PrismaClientKnownRequestError &&
    e.code === "P2022" &&
    /isPaused/i.test(`${e.message}${JSON.stringify(e.meta ?? {})}`)
  );
}

type ActiveRunLoaded = {
  battleSessionId: string;
  session: {
    id: string;
    status: BattleSessionStatus;
    isPaused: boolean;
  };
};

/**
 * Tolère une base sans colonne `BattleSession.isPaused` (migrations pas appliquées).
 */
async function loadActiveRunWithSession(
  runId: string,
): Promise<ActiveRunLoaded | null> {
  let sessionIsPaused = true;
  for (let attempt = 0; attempt < 8; attempt++) {
    try {
      const row = await prisma.managedEventRun.findFirst({
        where: {
          id: runId,
          status: ManagedEventStatus.ACTIVE,
          battleSessionId: { not: null },
        },
        select: {
          battleSessionId: true,
          session: {
            select: {
              id: true,
              status: true,
              ...(sessionIsPaused ? { isPaused: true } : {}),
            },
          },
        },
      });
      if (!row?.battleSessionId || !row.session) return null;
      const s = row.session;
      return {
        battleSessionId: row.battleSessionId,
        session: {
          id: s.id,
          status: s.status,
          isPaused: sessionIsPaused
            ? Boolean((s as { isPaused?: boolean }).isPaused)
            : false,
        },
      };
    } catch (e) {
      if (isP2022IsPaused(e)) {
        sessionIsPaused = false;
        continue;
      }
      throw e;
    }
  }
  throw new Error(
    "[kingshot] Impossible de lire le run : schéma Prisma / base incohérents.",
  );
}

async function updateBattleSessionEnded(sessionId: string): Promise<void> {
  try {
    await prisma.battleSession.update({
      where: { id: sessionId },
      data: {
        status: BattleSessionStatus.ENDED,
        endedAt: new Date(),
        isPaused: false,
      },
    });
  } catch (e) {
    if (!isP2022IsPaused(e)) throw e;
    await prisma.battleSession.update({
      where: { id: sessionId },
      data: {
        status: BattleSessionStatus.ENDED,
        endedAt: new Date(),
      },
    });
  }
}

/**
 * Repli base quand l’API HTTP du bot échoue (non configurée, 5xx, « Internal error », etc.).
 */
function shouldUseDatabaseFallback(r: ControlFail): boolean {
  const m = r.error.toLowerCase();
  return (
    r.error.includes("BOT_CONTROL_URL") ||
    r.error.includes("BOT_CONTROL_SECRET") ||
    r.error.includes("Contrôle à distance") ||
    m.includes("failed to fetch") ||
    m.includes("fetch failed") ||
    m.includes("networkerror") ||
    m.includes("econnrefused") ||
    m.includes("enotfound") ||
    m.includes("socket hang up") ||
    m.includes("impossible de joindre") ||
    (r.httpStatus != null && r.httpStatus >= 500) ||
    m.includes("internal error") ||
    m.includes("erreur serveur bot")
  );
}

async function stopRunInDatabase(
  runId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const run = await loadActiveRunWithSession(runId);
  if (!run?.session) {
    return { ok: false, error: "Run introuvable ou sans session active." };
  }
  if (run.session.status !== BattleSessionStatus.ACTIVE) {
    return { ok: false, error: "La session n’est plus active." };
  }

  await prisma.battleReminder.updateMany({
    where: {
      sessionId: run.session.id,
      status: { in: [ReminderStatus.PENDING, ReminderStatus.PROCESSING] },
    },
    data: { status: ReminderStatus.SKIPPED },
  });
  await updateBattleSessionEnded(run.session.id);
  await prisma.managedEventRun.updateMany({
    where: { id: runId, status: ManagedEventStatus.ACTIVE },
    data: {
      status: ManagedEventStatus.CANCELLED,
      completedAt: new Date(),
    },
  });
  return { ok: true };
}

async function pauseRunInDatabase(
  runId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const run = await loadActiveRunWithSession(runId);
  if (!run?.session) {
    return { ok: false, error: "Run introuvable ou sans session active." };
  }
  if (run.session.status !== BattleSessionStatus.ACTIVE) {
    return { ok: false, error: "La session n’est plus active." };
  }
  if (run.session.isPaused) {
    return { ok: false, error: "La bataille est déjà en pause." };
  }
  try {
    await prisma.battleSession.update({
      where: { id: run.session.id },
      data: { isPaused: true },
    });
  } catch (e) {
    if (isP2022IsPaused(e)) {
      return {
        ok: false,
        error:
          "Impossible de mettre en pause : la colonne « isPaused » est absente en base. Exécutez : npx prisma migrate deploy (ou prisma db push) sur le schéma du bot.",
      };
    }
    throw e;
  }
  return { ok: true };
}

async function resumeRunInDatabase(
  runId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const run = await loadActiveRunWithSession(runId);
  if (!run?.session) {
    return { ok: false, error: "Run introuvable ou sans session active." };
  }
  if (run.session.status !== BattleSessionStatus.ACTIVE) {
    return { ok: false, error: "La session n’est plus active." };
  }
  if (!run.session.isPaused) {
    return { ok: false, error: "La bataille n’est pas en pause." };
  }
  try {
    await prisma.battleSession.update({
      where: { id: run.session.id },
      data: { isPaused: false },
    });
  } catch (e) {
    if (isP2022IsPaused(e)) {
      return {
        ok: false,
        error:
          "Impossible de reprendre : colonne « isPaused » absente en base. Appliquez les migrations Prisma.",
      };
    }
    throw e;
  }
  return { ok: true };
}

async function handleControl(
  formData: FormData,
  action: "pause" | "resume" | "stop" | "next_phase",
  successMsg: string,
) {
  await requireAdmin();
  const runId = String(formData.get("runId") ?? "").trim();
  let redirectTo =
    String(formData.get("redirectTo") ?? "/dashboard/runs").trim() ||
    "/dashboard/runs";
  if (!redirectTo.startsWith("/")) redirectTo = "/dashboard/runs";

  if (!runId) {
    redirectWithToast(redirectTo, false, "Identifiant de run manquant.");
  }

  let r: InvokeBotRunControlResult = await invokeBotRunControl({
    action,
    runId,
  });

  if (!r.ok && shouldUseDatabaseFallback(r)) {
    if (action === "stop") {
      r = await stopRunInDatabase(runId);
      if (r.ok) {
        await appendRunLogSafe(
          runId,
          "info",
          "Arrêt depuis l’admin (base directe — le bot HTTP n’a pas pu confirmer).",
        );
      }
    } else if (action === "pause") {
      r = await pauseRunInDatabase(runId);
      if (r.ok) {
        await appendRunLogSafe(
          runId,
          "info",
          "Pause depuis l’admin (base directe). Les envois Discord sont ignorés tant que la session est marquée en pause.",
        );
      }
    } else if (action === "resume") {
      r = await resumeRunInDatabase(runId);
      if (r.ok) {
        await appendRunLogSafe(
          runId,
          "info",
          "Reprise depuis l’admin (base directe). Si les annonces ne repartent pas, redémarrez le worker bot pour réarmer les timers.",
        );
      }
    }
  }

  revalidatePath("/dashboard/runs");
  revalidatePath(`/dashboard/runs/${runId}`);
  revalidatePath("/dashboard");

  if (!r.ok) {
    await appendRunLogSafe(
      runId,
      "warn",
      `Action admin « ${action} » échouée · ${r.error}`,
    );
    redirectWithToast(redirectTo, false, r.error);
  }

  redirectWithToast(redirectTo, true, successMsg);
}

export async function pauseRunAction(formData: FormData) {
  await handleControl(formData, "pause", "Bataille mise en pause.");
}

export async function resumeRunAction(formData: FormData) {
  await handleControl(formData, "resume", "Bataille reprise.");
}

export async function stopRunAction(formData: FormData) {
  await handleControl(
    formData,
    "stop",
    "Bataille arrêtée. Le run est marqué annulé.",
  );
}

export async function nextPhaseRunAction(formData: FormData) {
  await handleControl(
    formData,
    "next_phase",
    "Phase suivante envoyée sur Discord.",
  );
}
