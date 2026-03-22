import type { ChatInputCommandInteraction } from "discord.js";
import type { EmbedBuilder } from "discord.js";
import { ANNOUNCE_USER_MAX_CHARS } from "@kingshot/shared";

export function requireGuild(interaction: ChatInputCommandInteraction) {
  if (!interaction.guildId) {
    void interaction.reply({
      content: "Use this in a server channel.",
      ephemeral: true,
    });
    return null;
  }
  return interaction.guildId;
}

export async function replyEphemeral(
  interaction: ChatInputCommandInteraction,
  content: string,
) {
  const payload = { content, ephemeral: true as const };
  if (interaction.deferred || interaction.replied) {
    await interaction.followUp(payload);
  } else {
    await interaction.reply(payload);
  }
}

export async function replyEphemeralEmbeds(
  interaction: ChatInputCommandInteraction,
  embeds: EmbedBuilder[],
) {
  const payload = { embeds, ephemeral: true as const };
  if (interaction.deferred || interaction.replied) {
    await interaction.followUp(payload);
  } else {
    await interaction.reply(payload);
  }
}

/** Returns English ephemeral error, or null if OK. */
export function validateAnnounceMessage(message: string): string | null {
  if (message.length > ANNOUNCE_USER_MAX_CHARS) {
    return `Message too long (max ${ANNOUNCE_USER_MAX_CHARS} chars). Shorten and retry.`;
  }
  return null;
}
