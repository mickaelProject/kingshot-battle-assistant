import { ChannelType, type Client, PermissionFlagsBits } from "discord.js";

export type ManagedChannelVerifyFailure =
  | "GUILD_UNAVAILABLE"
  | "CHANNEL_NOT_FOUND"
  | "CHANNEL_NOT_TEXT"
  | "CHANNEL_WRONG_GUILD"
  | "CHANNEL_NO_PERMISSION";

/**
 * Ensures the snowflake is a guild text/announcement channel the bot can post embeds in.
 */
export async function verifyGuildTextChannelForManagedEvent(
  client: Client,
  discordGuildId: string,
  channelId: string,
): Promise<
  | { ok: true; channelName: string }
  | { ok: false; reason: ManagedChannelVerifyFailure; detail: string }
> {
  const guild = await client.guilds.fetch(discordGuildId).catch(() => null);
  if (!guild) {
    return {
      ok: false,
      reason: "GUILD_UNAVAILABLE",
      detail:
        "Bot cannot see this Discord server (not invited, or gateway cache not ready).",
    };
  }

  const ch = await guild.channels.fetch(channelId).catch(() => null);
  if (!ch) {
    return {
      ok: false,
      reason: "CHANNEL_NOT_FOUND",
      detail: `Channel ${channelId} was not found in this server.`,
    };
  }

  if (
    ch.type !== ChannelType.GuildText &&
    ch.type !== ChannelType.GuildAnnouncement
  ) {
    return {
      ok: false,
      reason: "CHANNEL_NOT_TEXT",
      detail: "Only text and announcement channels can receive battle embeds.",
    };
  }

  if (!ch.isTextBased()) {
    return {
      ok: false,
      reason: "CHANNEL_NOT_TEXT",
      detail: "This channel cannot receive text messages.",
    };
  }

  if ("guildId" in ch && ch.guildId !== discordGuildId) {
    return {
      ok: false,
      reason: "CHANNEL_WRONG_GUILD",
      detail: "That channel does not belong to the selected server.",
    };
  }

  const me = guild.members.me;
  if (!me) {
    return {
      ok: false,
      reason: "CHANNEL_NO_PERMISSION",
      detail: "Could not resolve the bot member for permission checks.",
    };
  }

  const perms = ch.permissionsFor(me);
  const need =
    PermissionFlagsBits.ViewChannel |
    PermissionFlagsBits.SendMessages |
    PermissionFlagsBits.EmbedLinks;

  if (!perms?.has(need)) {
    return {
      ok: false,
      reason: "CHANNEL_NO_PERMISSION",
      detail:
        "Bot needs View Channel, Send Messages, and Embed Links in that channel.",
    };
  }

  return { ok: true, channelName: ch.name };
}
