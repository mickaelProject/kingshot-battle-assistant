import type { AppLocale } from "@/i18n/config";

function offsetAtStart(locale: AppLocale): string {
  if (locale === "en") return "At start";
  if (locale === "es") return "Al inicio";
  return "Au démarrage";
}

/** Compact “T+…” label for timeline rails (SaaS-style). */
export function formatTimelineTLabel(seconds: number): string {
  if (seconds === 0) return "T+0";
  if (seconds < 60) return `T+${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m < 60 && s === 0) return `T+${m}min`;
  if (m < 60) return `T+${m}m${s}s`;
  const h = Math.floor(m / 60);
  const rm = m % 60;
  if (rm === 0 && s === 0) return `T+${h}h`;
  if (s === 0) return `T+${h}h${rm}m`;
  return `T+${h}h${rm}m${s}s`;
}

/** User-facing label for seconds after battle start (T+0). */
export function formatOffsetLabel(
  seconds: number,
  locale: AppLocale = "fr",
): string {
  if (seconds === 0) return offsetAtStart(locale);
  if (seconds < 60) return `+${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m < 60 && s === 0) return `+${m} min`;
  if (m < 60) return `+${m} min ${s}s`;
  const h = Math.floor(m / 60);
  const rm = m % 60;
  if (rm === 0 && s === 0) return `+${h} h`;
  if (s === 0) return `+${h} h ${rm} min`;
  return `+${h} h ${rm} min`;
}

/** Estimated event span = last phase offset (typical timeline). */
export function templateDurationSeconds(
  offsets: readonly number[],
): number {
  if (offsets.length === 0) return 0;
  return Math.max(...offsets);
}

export function formatDurationHuman(
  totalSeconds: number,
  _locale: AppLocale = "fr",
): string {
  if (totalSeconds <= 0) return "—";
  if (totalSeconds < 60) return `${totalSeconds}s`;
  const m = Math.floor(totalSeconds / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rm = m % 60;
  return rm ? `${h} h ${rm} min` : `${h} h`;
}

/** Convert UI "minutes after start" to seconds. */
export function minutesToOffsetSeconds(minutes: number): number {
  if (!Number.isFinite(minutes) || minutes < 0) return 0;
  return Math.round(minutes * 60);
}

export function offsetSecondsToMinutes(seconds: number): number {
  return Math.round(seconds / 60);
}

/** Horloge type MM:SS ou H:MM:SS pour temps écoulé. */
export function formatElapsedClock(totalSeconds: number): string {
  let s = Math.floor(totalSeconds);
  if (!Number.isFinite(s) || s < 0) s = 0;
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  }
  return `${m}:${String(sec).padStart(2, "0")}`;
}
