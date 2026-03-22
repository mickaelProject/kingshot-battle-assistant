import type { ChatInputCommandInteraction } from "discord.js";
import { prisma } from "../../db/prisma.js";
import { getActiveSession } from "../../services/battle-session-service.js";
import { replyEphemeral } from "../util.js";

export async function handleAssign(
  interaction: ChatInputCommandInteraction,
  guildSettingsId: string,
): Promise<void> {
  if (!interaction.guildId) return;
  const slot = interaction.options.getString("slot", true);
  const user = interaction.options.getUser("player", true);

  const session = await getActiveSession(guildSettingsId);
  if (!session) {
    await replyEphemeral(
      interaction,
      "No active battle. Start with `/battle start` first.",
    );
    return;
  }

  await prisma.playerAssignment.create({
    data: {
      guildId: guildSettingsId,
      sessionId: session.id,
      slotLabel: slot,
      userId: user.id,
    },
  });

  const ch = await interaction.client.channels.fetch(session.channelId);
  if (!ch?.isSendable()) {
    await replyEphemeral(interaction, "Cannot post to battle channel.");
    return;
  }

  await ch.send({
    content: `**${slot}** → <@${user.id}>`,
    allowedMentions: { users: [user.id] },
  });
  await replyEphemeral(interaction, "Assignment posted.");
}
