import type { ChatInputCommandInteraction } from "discord.js";
import {
  addTemplateEvent,
  createTemplate,
  deleteTemplateByName,
  listTemplatesWithCounts,
  setDefaultTemplate,
} from "../../services/battle-template-service.js";
import { replyEphemeral } from "../util.js";

export async function handleTemplate(
  interaction: ChatInputCommandInteraction,
  guildSettingsId: string,
): Promise<void> {
  const sub = interaction.options.getSubcommand();

  if (sub === "list") {
    const list = await listTemplatesWithCounts(guildSettingsId);
    if (list.length === 0) {
      await replyEphemeral(
        interaction,
        "No templates yet. Create one: `/template create`",
      );
      return;
    }
    const lines = list.map(
      (t) =>
        `• **${t.name}** ×${t._count.events}${t.isDefault ? " · default" : ""}`,
    );
    await replyEphemeral(interaction, lines.join("\n").slice(0, 1900));
    return;
  }

  if (sub === "create") {
    const name = interaction.options.getString("name", true);
    const description = interaction.options.getString("description");
    await createTemplate(guildSettingsId, name, description);
    await replyEphemeral(interaction, `Created **${name}**.`);
    return;
  }

  if (sub === "delete") {
    const name = interaction.options.getString("name", true);
    const result = await deleteTemplateByName(guildSettingsId, name);
    if (result.outcome === "NOT_FOUND") {
      await replyEphemeral(interaction, "Template not found.");
      return;
    }
    if (result.outcome === "IS_DEFAULT") {
      await replyEphemeral(
        interaction,
        "Cannot delete the default template. Set another default with `/template default` first.",
      );
      return;
    }
    if (result.outcome === "IN_USE") {
      await replyEphemeral(
        interaction,
        "Cannot delete: this template is linked to past battles.",
      );
      return;
    }
    await replyEphemeral(interaction, `Removed **${result.name}**.`);
    return;
  }

  if (sub === "default") {
    const name = interaction.options.getString("name", true);
    const r = await setDefaultTemplate(guildSettingsId, name);
    if (!r.ok) {
      await replyEphemeral(interaction, "Template not found.");
      return;
    }
    await replyEphemeral(interaction, `Default set: **${name}**.`);
    return;
  }

  if (sub === "event_add") {
    const templateName = interaction.options.getString("template", true);
    const offset = interaction.options.getInteger("offset_seconds", true);
    const key = interaction.options.getString("key", true);
    const phaseTypeRaw = interaction.options.getString("phase_type", true);
    const title = interaction.options.getString("title", true);
    const objective = interaction.options.getString("objective");
    const action = interaction.options.getString("action");
    const nextHint = interaction.options.getString("next_hint");

    const r = await addTemplateEvent({
      guildSettingsId,
      templateName,
      offsetSeconds: offset,
      key,
      phaseTypeRaw,
      title,
      objective,
      action,
      nextHint,
    });
    if (!r.ok && r.reason === "BAD_OFFSET") {
      await replyEphemeral(
        interaction,
        "`offset_seconds` must be a whole number ≥ 0.",
      );
      return;
    }
    if (!r.ok && r.reason === "BAD_PHASE") {
      await replyEphemeral(
        interaction,
        "Invalid `phase_type`. Pick one of the listed choices.",
      );
      return;
    }
    if (!r.ok && r.reason === "BAD_TITLE") {
      await replyEphemeral(
        interaction,
        "`title` is required (short headline for the phase).",
      );
      return;
    }
    if (!r.ok) {
      await replyEphemeral(interaction, "Template not found.");
      return;
    }
    await replyEphemeral(
      interaction,
      `**${templateName}** · T+${offset}s · \`${key}\` · **${phaseTypeRaw.toUpperCase()}** saved.`,
    );
  }
}
