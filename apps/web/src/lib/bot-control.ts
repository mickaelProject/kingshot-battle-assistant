export type BotControlAction = "pause" | "resume" | "stop" | "next_phase";

/**
 * Appelle l’API HTTP du bot (Bearer BOT_CONTROL_SECRET).
 * En prod : BOT_CONTROL_URL = URL publique du service (ex. https://xxx.up.railway.app).
 */
export async function invokeBotRunControl(payload: {
  action: BotControlAction;
  runId: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const base = process.env.BOT_CONTROL_URL?.trim().replace(/\/$/, "");
  const secret = process.env.BOT_CONTROL_SECRET?.trim();
  if (!base || !secret) {
    return {
      ok: false,
      error:
        "Contrôle à distance non configuré : BOT_CONTROL_URL et BOT_CONTROL_SECRET requis sur l’admin web (voir .env.example).",
    };
  }

  try {
    const res = await fetch(`${base}/internal/run-control`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${secret}`,
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    let data: { ok?: boolean; error?: string } = {};
    try {
      data = (await res.json()) as { ok?: boolean; error?: string };
    } catch {
      /* corps non JSON */
    }

    if (!res.ok) {
      return {
        ok: false,
        error: data.error ?? `Erreur HTTP ${res.status}`,
      };
    }
    if (data.ok === true) return { ok: true };
    return {
      ok: false,
      error: data.error ?? "Réponse inattendue du bot.",
    };
  } catch (e) {
    return {
      ok: false,
      error:
        e instanceof Error
          ? e.message
          : "Impossible de joindre le bot (réseau ou URL incorrecte).",
    };
  }
}
