import type { RosterPlayer } from "./types";

/**
 * Parse lines such as:
 *   CRICKETTS 3704
 *   EDA 3014
 *   TOBI, 2662
 *   PlayerName	3014  (tab)
 * Ignores empty lines and lines that do not match NAME + POWER.
 */
export function parseRosterLines(raw: string): RosterPlayer[] {
  const lines = raw.split(/\r?\n/);
  const out: RosterPlayer[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const m = trimmed.match(/^(.+?)[\s,]+(\d[\d\s.,]*)$/u);
    if (!m) continue;

    const name = m[1]!
      .trim()
      .replace(/\s+/g, " ")
      .replace(/^["']|["']$/g, "");
    const powerStr = m[2]!.replace(/\s/g, "").replace(/,/g, "");
    const power = parseInt(powerStr, 10);
    if (!name || !Number.isFinite(power) || power < 0) continue;

    out.push({ name, power });
  }

  return dedupeByName(out).sort((a, b) => b.power - a.power);
}

function dedupeByName(players: RosterPlayer[]): RosterPlayer[] {
  const best = new Map<string, RosterPlayer>();
  for (const p of players) {
    const key = p.name.toUpperCase();
    const prev = best.get(key);
    if (!prev || p.power > prev.power) best.set(key, p);
  }
  return [...best.values()].sort((a, b) => b.power - a.power);
}
