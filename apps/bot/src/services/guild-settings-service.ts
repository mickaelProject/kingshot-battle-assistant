import { prisma } from "../db/prisma.js";

export async function ensureGuildSettings(discordGuildId: string) {
  return prisma.guildSettings.upsert({
    where: { discordGuildId },
    create: { discordGuildId },
    update: {},
  });
}

export async function getGuildByDiscordId(discordGuildId: string) {
  return prisma.guildSettings.findUnique({
    where: { discordGuildId },
    include: { defaultTemplate: true },
  });
}

export async function setBattleChannel(
  guildSettingsId: string,
  channelId: string,
) {
  return prisma.guildSettings.update({
    where: { id: guildSettingsId },
    data: { battleChannelId: channelId },
  });
}

export async function getGuildSettingsById(guildSettingsId: string) {
  return prisma.guildSettings.findUniqueOrThrow({
    where: { id: guildSettingsId },
  });
}
