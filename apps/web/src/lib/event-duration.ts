/** Durée événement in-game (minutes), bornée pour l’UI. */
export function parseEventDurationMinutes(
  raw: string | number | FormDataEntryValue | null | undefined,
): number {
  const n =
    typeof raw === "number"
      ? raw
      : Number(String(raw ?? "").trim() || Number.NaN);
  if (!Number.isFinite(n) || n < 1) return 60;
  return Math.min(Math.round(n), 24 * 60);
}

/** Pour les flux où la durée est obligatoire (ex. génération roster). */
export function parseEventDurationMinutesStrict(
  raw: string | number | FormDataEntryValue | null | undefined,
): number | null {
  const n =
    typeof raw === "number"
      ? raw
      : Number(String(raw ?? "").trim() || Number.NaN);
  if (!Number.isFinite(n) || n < 1) return null;
  return Math.min(Math.round(n), 24 * 60);
}
