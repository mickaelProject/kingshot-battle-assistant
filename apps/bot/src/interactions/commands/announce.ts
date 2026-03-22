import type { ChatInputCommandInteraction } from "discord.js";
import { replyEphemeral } from "../util.js";

/** Length checked in router via `validateAnnounceMessage`. */
export async function handleAnnounce(
  interaction: ChatInputCommandInteraction,
  guildRow: { battleChannelId: string | null },
): Promise<void> {
  if (!guildRow.battleChannelId) {
    await replyEphemeral(
      interaction,
      "No battle channel. Run `/setup channel` first.",
    );
    return;
  }
  const msg = interaction.options.getString("message", true);
  const ch = await interaction.client.channels.fetch(guildRow.battleChannelId);
  if (!ch?.isSendable()) {
    await replyEphemeral(
      interaction,
      "Battle channel missing or not a text channel.",
    );
    return;
  }
  await ch.send({
    content: `📣 ${msg}`,
    allowedMentions: { parse: ["users", "roles"] },
  });
  await replyEphemeral(interaction, "Posted to battle feed.");
}
