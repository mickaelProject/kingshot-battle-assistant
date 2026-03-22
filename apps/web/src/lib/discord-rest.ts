const DISCORD_API = "https://discord.com/api/v10";

/** Discord API: GUILD_TEXT = 0, GUILD_ANNOUNCEMENT = 5 */
const TEXT_CHANNEL_TYPES = new Set([0, 5]);

export type DiscordGuildChannel = {
  id: string;
  name: string;
  type: number;
  position: number;
  parent_id: string | null;
};

export function hasDiscordBotToken(): boolean {
  return Boolean(process.env.DISCORD_BOT_TOKEN?.trim());
}

/**
 * Lists text + announcement channels for a guild (bot token, same as the live bot).
 */
export async function fetchGuildTextChannels(
  discordGuildId: string,
): Promise<DiscordGuildChannel[]> {
  const token = process.env.DISCORD_BOT_TOKEN?.trim();
  if (!token) return [];

  const res = await fetch(`${DISCORD_API}/guilds/${discordGuildId}/channels`, {
    headers: { Authorization: `Bot ${token}` },
    cache: "no-store",
  });

  if (!res.ok) {
    console.warn(
      "[kingshot:web] Discord GET /guilds/.../channels failed",
      res.status,
    );
    return [];
  }

  const raw = (await res.json()) as DiscordGuildChannel[];
  return raw
    .filter((c) => TEXT_CHANNEL_TYPES.has(c.type))
    .sort((a, b) => {
      const pa = a.parent_id ?? "";
      const pb = b.parent_id ?? "";
      if (pa !== pb) return pa.localeCompare(pb);
      return a.position - b.position;
    });
}

export type GuildChannelOption = { id: string; name: string };

/**
 * Appels Discord en parallèle (évite N × latence réseau en série sur le dashboard).
 */
export async function fetchGuildTextChannelOptionsByGuildId(
  guilds: { id: string; discordGuildId: string }[],
): Promise<Map<string, GuildChannelOption[]>> {
  if (!hasDiscordBotToken() || guilds.length === 0) {
    return new Map(guilds.map((g) => [g.id, []]));
  }
  const pairs = await Promise.all(
    guilds.map(async (g) => {
      const raw = await fetchGuildTextChannels(g.discordGuildId);
      const opts: GuildChannelOption[] = raw.map((c) => ({
        id: c.id,
        name: c.name,
      }));
      return [g.id, opts] as const;
    }),
  );
  return new Map(pairs);
}

export async function assertGuildTextChannelId(
  discordGuildId: string,
  channelId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!hasDiscordBotToken()) {
    return {
      ok: false,
      error:
        "DISCORD_BOT_TOKEN est absent dans apps/web/.env : impossible de valider le salon. Ajoute le même token que le bot.",
    };
  }

  const channels = await fetchGuildTextChannels(discordGuildId);
  if (channels.length === 0) {
    return {
      ok: false,
      error:
        "Aucun salon texte listé (vérifie que le bot est dans le serveur et que le token est correct).",
    };
  }

  if (!channels.some((c) => c.id === channelId)) {
    return {
      ok: false,
      error:
        "Le salon choisi n’est pas un salon texte/annonces de ce serveur, ou il n’est plus accessible au bot.",
    };
  }

  return { ok: true };
}
