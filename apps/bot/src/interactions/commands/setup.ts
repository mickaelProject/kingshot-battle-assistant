import type { ChatInputCommandInteraction } from "discord.js";
import { ChannelType } from "discord.js";
import { setBattleChannel } from "../../services/guild-settings-service.js";
import { replyEphemeral } from "../util.js";

export async function handleSetup(
  interaction: ChatInputCommandInteraction,
  guildSettingsId: string,
): Promise<void> {
  const sub = interaction.options.getSubcommand();
  if (sub !== "channel") return;

  const ch = interaction.options.getChannel("target", true);
  if (
    ch.type !== ChannelType.GuildText &&
    ch.type !== ChannelType.GuildAnnouncement
  ) {
    await replyEphemeral(
      interaction,
      "Choose a text or announcement channel.",
    );
    return;
  }

  await setBattleChannel(guildSettingsId, ch.id);
  await replyEphemeral(
    interaction,
    `Battle feed locked to <#${ch.id}>.`,
  );
}
