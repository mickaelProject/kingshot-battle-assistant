import type { ParsedPlayer } from "@/lib/roster-editor-types";

export function parseRosterLine(line: string): ParsedPlayer | null {
  const trimmed = line.trim();
  if (!trimmed) return null;
  const match = trimmed.match(/^(.+?)\s+(\d{3,6})\s*$/);
  if (!match) {
    return { name: trimmed, power: null, error: true };
  }
  return {
    name: match[1]!.trim(),
    power: parseInt(match[2]!, 10),
    error: false,
  };
}

export function parseRosterText(text: string): ParsedPlayer[] {
  const lines = text.split(/\r?\n/);
  const out: ParsedPlayer[] = [];
  for (const line of lines) {
    const p = parseRosterLine(line);
    if (p) out.push(p);
  }
  return out;
}

export function formatPowerDisplay(n: number): string {
  if (n >= 1000) {
    const k = n / 1000;
    const s = k % 1 === 0 ? `${Math.round(k)}k` : `${k.toFixed(1)}k`;
    return s;
  }
  return String(n);
}
