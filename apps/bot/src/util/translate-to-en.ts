/**
 * Best-effort EN for tactical Discord embeds (MyMemory, cached).
 * Set DISCORD_TACTICAL_TRANSLATE_EN=0 to send original text only.
 */

const cache = new Map<string, string>();

function disabled(): boolean {
  return process.env.DISCORD_TACTICAL_TRANSLATE_EN === "0";
}

function looksLikeTranslationApiFailure(text: string): boolean {
  const u = text.toUpperCase();
  return (
    (u.includes("INVALID") && u.includes("LANGUAGE")) ||
    u.includes("LANGPAIR") ||
    u.includes("RFC3066") ||
    u.includes("MYMEMORY")
  );
}

export async function translateToEnglish(text: string): Promise<string> {
  const t = text.trim();
  if (!t || disabled()) return text;
  const hit = cache.get(t);
  if (hit != null) return hit;

  try {
    const u = new URL("https://api.mymemory.translated.net/get");
    u.searchParams.set("q", t.slice(0, 450));
    u.searchParams.set("langpair", "fr|en");
    const res = await fetch(u.toString(), {
      signal: AbortSignal.timeout(4500),
      headers: { Accept: "application/json" },
    });
    if (!res.ok) {
      cache.set(t, text);
      return text;
    }
    const data = (await res.json()) as {
      responseData?: { translatedText?: string };
      responseStatus?: number;
    };
    const out = data.responseData?.translatedText?.trim();
    if (
      !out ||
      out === t ||
      looksLikeTranslationApiFailure(out) ||
      data.responseStatus === 403
    ) {
      cache.set(t, text);
      return text;
    }
    cache.set(t, out);
    return out;
  } catch {
    cache.set(t, text);
    return text;
  }
}

export async function translateTacticalFieldsToEn(input: {
  title: string;
  objective: string;
  action: string;
  nextHint: string;
}): Promise<typeof input> {
  if (disabled()) return input;
  const [title, objective, action, nextHint] = await Promise.all([
    translateToEnglish(input.title),
    translateToEnglish(input.objective),
    translateToEnglish(input.action),
    translateToEnglish(input.nextHint),
  ]);
  return { title, objective, action, nextHint };
}
