/**
 * Optional FR → EN for live copy when UI locale is English.
 * MyMemory does not support langpair=auto|en; use explicit fr|en.
 */

const cache = new Map<string, string>();

function disabled(): boolean {
  return process.env.LIVE_TRANSLATE_DISABLED === "1";
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

/**
 * Uses MyMemory public API (no key; rate-limited). Falls back to original on failure.
 */
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

export async function translateManyToEnglish(
  inputs: string[],
): Promise<string[]> {
  return Promise.all(inputs.map((s) => translateToEnglish(s)));
}
