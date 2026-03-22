import { prisma } from "../db/prisma.js";

export type RunLogLevel = "info" | "warn" | "error";

/** Best-effort persistence for alliance debugging (never throws). */
export async function appendManagedRunLog(
  runId: string,
  level: RunLogLevel,
  message: string,
): Promise<void> {
  try {
    await prisma.managedEventRunLog.create({
      data: { runId, level, message: message.slice(0, 2000) },
    });
  } catch {
    /* ignore */
  }
}
