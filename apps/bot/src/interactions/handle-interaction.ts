import type {
  AutocompleteInteraction,
  ChatInputCommandInteraction,
} from "discord.js";
import { PermissionFlagsBits } from "discord.js";
import type { ReminderScheduler } from "../services/reminder-scheduling-service.js";
import { autocompleteTemplateNames } from "../services/battle-template-service.js";
import { getActiveSession } from "../services/battle-session-service.js";
import {
  ensureGuildSettings,
  getGuildByDiscordId,
} from "../services/guild-settings-service.js";
import { handleAnnounce } from "./commands/announce.js";
import { handleAssign } from "./commands/assign.js";
import { handleBattle } from "./commands/battle.js";
import { handleSetup } from "./commands/setup.js";
import { handleTemplate } from "./commands/template.js";
import { replyEphemeral, requireGuild, validateAnnounceMessage } from "./util.js";

export async function handleAutocomplete(
  interaction: AutocompleteInteraction,
): Promise<void> {
  const focused = interaction.options.getFocused(true);
  if (focused.name !== "name" && focused.name !== "template") return;

  const guildId = interaction.guildId;
  if (!guildId) return;

  const gs = await getGuildByDiscordId(guildId);
  if (!gs) {
    await interaction.respond([]);
    return;
  }

  const q = focused.value.toLowerCase();
  const templates = await autocompleteTemplateNames(gs.id, q);
  await interaction.respond(
    templates.map((t) => ({ name: t.name, value: t.name })),
  );
}

export async function handleChatInput(
  interaction: ChatInputCommandInteraction,
  scheduler: ReminderScheduler,
): Promise<void> {
  const discordGuildId = requireGuild(interaction);
  if (!discordGuildId) return;

  if (
    !interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)
  ) {
    await interaction.reply({
      content: "Administrator only.",
      ephemeral: true,
    });
    return;
  }

  const guildRow = await ensureGuildSettings(discordGuildId);

  if (interaction.commandName === "announce") {
    const msg = interaction.options.getString("message", true);
    const bad = validateAnnounceMessage(msg);
    if (bad) {
      await interaction.reply({ content: bad, ephemeral: true });
      return;
    }
  }

  if (interaction.commandName === "assign") {
    const live = await getActiveSession(guildRow.id);
    if (!live) {
      await interaction.reply({
        content: "No active battle. Start one with `/battle start` first.",
        ephemeral: true,
      });
      return;
    }
  }

  await interaction.deferReply({ ephemeral: true });

  try {
    switch (interaction.commandName) {
      case "setup":
        await handleSetup(interaction, guildRow.id);
        break;
      case "template":
        await handleTemplate(interaction, guildRow.id);
        break;
      case "battle":
        await handleBattle(interaction, guildRow.id, scheduler);
        break;
      case "announce":
        await handleAnnounce(interaction, guildRow);
        break;
      case "assign":
        await handleAssign(interaction, guildRow.id);
        break;
      default:
        await replyEphemeral(interaction, "Unknown command.");
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Something went wrong.";
    await replyEphemeral(interaction, msg);
  }
}
