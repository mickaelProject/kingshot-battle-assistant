import type { BattlePhaseType } from "@prisma/client";
import { EmbedBuilder } from "discord.js";

const PHASE_STYLE: Record<
  BattlePhaseType,
  { color: number; ribbon: string; label: string }
> = {
  START: {
    color: 0x2dd4bf,
    ribbon: "▶",
    label: "START",
  },
  OBJECTIVE: {
    color: 0x60a5fa,
    ribbon: "◎",
    label: "OBJECTIVE",
  },
  REMINDER: {
    color: 0xfbbf24,
    ribbon: "⏱",
    label: "REMINDER",
  },
  FINAL: {
    color: 0xf87171,
    ribbon: "⏳",
    label: "FINAL",
  },
};

const TITLE_MAX = 220;
const DESC_MAX = 3_500;
const FOOTER = "Kingshot tactical";

function clip(s: string, max: number): string {
  const t = s.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

export type TacticalPhaseContent = {
  phaseType: BattlePhaseType;
  title: string;
  objective?: string;
  action?: string;
  nextHint?: string;
};

/**
 * Compact, high-contrast embed: clear phase title, body in description (mobile-friendly).
 */
export function buildTacticalPhaseEmbed(
  input: TacticalPhaseContent,
): EmbedBuilder {
  const style = PHASE_STYLE[input.phaseType];
  const phaseTitle =
    input.title.trim() ||
    input.objective?.trim() ||
    input.action?.trim() ||
    "Tactical update";

  const objective = input.objective?.trim();
  const action = input.action?.trim();
  const nextHint = input.nextHint?.trim();

  const bodyParts: string[] = [];
  if (objective) {
    bodyParts.push(`**Objective**\n${clip(objective, 1_200)}`);
  }
  if (action) {
    bodyParts.push(`**Action**\n${clip(action, 1_200)}`);
  }
  if (nextHint) {
    bodyParts.push(`**Next**\n${clip(nextHint, 900)}`);
  }

  const embed = new EmbedBuilder()
    .setColor(style.color)
    .setAuthor({
      name: `${style.ribbon} ${style.label}`,
    })
    .setTitle(clip(phaseTitle, TITLE_MAX))
    .setFooter({ text: FOOTER })
    .setTimestamp(new Date());

  if (bodyParts.length > 0) {
    embed.setDescription(clip(bodyParts.join("\n\n"), DESC_MAX));
  }

  return embed;
}

/** Ephemeral confirmation when a battle session is armed (same visual language). */
export function buildBattleStartConfirmationEmbed(params: {
  templateName: string;
  channelMention: string;
  phaseCount: number;
}): EmbedBuilder {
  return buildTacticalPhaseEmbed({
    phaseType: "START",
    title: "Battle armed",
    objective: `Template **${clip(params.templateName, 80)}**`,
    action: `${params.phaseCount} tactical phase${params.phaseCount === 1 ? "" : "s"} queued (T+0 = now).`,
    nextHint: `Feed → ${params.channelMention}`,
  });
}
