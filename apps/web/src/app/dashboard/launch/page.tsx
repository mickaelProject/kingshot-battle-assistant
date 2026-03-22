import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import {
  fetchGuildTextChannels,
  hasDiscordBotToken,
} from "@/lib/discord-rest";
import { LaunchClient } from "./launch-client";

export default async function LaunchPage() {
  await requireAdmin();
  const guilds = await prisma.guildSettings.findMany({
    orderBy: { discordGuildId: "asc" },
    select: {
      id: true,
      discordGuildId: true,
      battleChannelId: true,
    },
  });
  const templates = await prisma.battleTemplate.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, guildId: true },
  });

  const channelsByGuildId: Record<string, { id: string; name: string }[]> = {};
  for (const g of guilds) {
    const raw = await fetchGuildTextChannels(g.discordGuildId);
    channelsByGuildId[g.id] = raw.map((c) => ({ id: c.id, name: c.name }));
  }

  return (
    <LaunchClient
      guilds={guilds.map((g) => ({
        id: g.id,
        discordGuildId: g.discordGuildId,
        battleChannelId: g.battleChannelId,
      }))}
      templates={templates}
      channelsByGuildId={channelsByGuildId}
      discordConfigured={hasDiscordBotToken()}
    />
  );
}
