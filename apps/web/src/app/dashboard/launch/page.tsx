import { isAdminDevUi } from "@/lib/is-admin-dev-ui";
import { prisma } from "@/lib/prisma";
import {
  getDiscordBotInviteUrl,
  getDiscordInstallRedirectUri,
} from "@/lib/discord-invite";
import {
  fetchGuildTextChannelOptionsByGuildId,
  hasDiscordBotToken,
} from "@/lib/discord-rest";
import { LaunchClient } from "./launch-client";

export default async function LaunchPage() {
  const discordInviteUrl = getDiscordBotInviteUrl();
  const discordInstallRedirectUri = getDiscordInstallRedirectUri();
  const [guilds, templates] = await Promise.all([
    prisma.guildSettings.findMany({
      orderBy: { discordGuildId: "asc" },
      select: {
        id: true,
        discordGuildId: true,
        battleChannelId: true,
      },
    }),
    prisma.battleTemplate.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, guildId: true },
    }),
  ]);

  const channelMap = await fetchGuildTextChannelOptionsByGuildId(guilds);
  const channelsByGuildId: Record<string, { id: string; name: string }[]> =
    Object.fromEntries(channelMap);

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
      discordInviteUrl={discordInviteUrl}
      discordInstallRedirectUri={discordInstallRedirectUri}
      devManualChannelEntry={isAdminDevUi()}
    />
  );
}
