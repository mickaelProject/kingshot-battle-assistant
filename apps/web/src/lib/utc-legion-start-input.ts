/** Saisie « datetime » interprétée comme heure UTC (pas le fuseau du navigateur). */

export function formatUtcDatetimeInputValue(d: Date): string {
  const y = d.getUTCFullYear();
  const mo = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  const h = String(d.getUTCHours()).padStart(2, "0");
  const mi = String(d.getUTCMinutes()).padStart(2, "0");
  return `${y}-${mo}-${day}T${h}:${mi}`;
}

/**
 * Chaîne `YYYY-MM-DDTHH:mm` ou `YYYY-MM-DDTHH:mm:ss` lue comme instant UTC.
 */
export function parseUtcDatetimeInputToDate(s: string): Date | null {
  const t = s.trim();
  if (!t) return null;
  const m =
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(t);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const h = Number(m[4]);
  const mi = Number(m[5]);
  const se = m[6] != null ? Number(m[6]) : 0;
  if (
    !Number.isFinite(y) ||
    !Number.isFinite(mo) ||
    !Number.isFinite(d) ||
    !Number.isFinite(h) ||
    !Number.isFinite(mi) ||
    !Number.isFinite(se)
  ) {
    return null;
  }
  if (
    mo < 1 ||
    mo > 12 ||
    d < 1 ||
    d > 31 ||
    h > 23 ||
    mi > 59 ||
    se > 59
  ) {
    return null;
  }
  const dt = new Date(Date.UTC(y, mo - 1, d, h, mi, se, 0));
  if (
    dt.getUTCFullYear() !== y ||
    dt.getUTCMonth() !== mo - 1 ||
    dt.getUTCDate() !== d
  ) {
    return null;
  }
  return dt;
}

export function addMinutesUtc(base: Date, minutes: number): Date {
  return new Date(base.getTime() + minutes * 60_000);
}

/** Découpe `YYYY-MM-DDTHH:mm` (UTC) pour `<input type="date">` et `<input type="time">`. */
export function splitUtcDatetimeInput(s: string): { date: string; time: string } {
  const t = s.trim();
  if (!t) return { date: "", time: "" };
  const m =
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(t);
  if (!m) return { date: "", time: "" };
  return {
    date: `${m[1]}-${m[2]}-${m[3]}`,
    time: `${m[4]}:${m[5]}`,
  };
}

/** Assemble date + heure (composants UTC) en chaîne acceptée par `parseUtcDatetimeInputToDate`. */
export function mergeUtcDateAndTime(date: string, time: string): string | null {
  const d = date.trim();
  const ti = time.trim();
  if (!d || !ti) return null;
  const hm = ti.length >= 5 ? ti.slice(0, 5) : ti;
  const merged = `${d}T${hm}`;
  return parseUtcDatetimeInputToDate(merged) != null ? merged : null;
}
