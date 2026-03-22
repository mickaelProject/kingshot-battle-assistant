"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { invokeBotRunControl } from "@/lib/bot-control";
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

  const r = await invokeBotRunControl({ action, runId });

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
