import {
  fetchGuildTextChannels,
  hasDiscordBotToken,
} from "@/lib/discord-rest";
import { fetchBattleTemplatesForEventsWizard } from "@/lib/battle-templates-queries";
import { prisma } from "@/lib/prisma";
import {
  formatOffsetLabel,
  templateDurationSeconds,
} from "@/lib/time-human";
import { EventsWizard } from "./events-wizard";

const PHASE_TYPE_FR: Record<string, string> = {
  START: "Début",
  OBJECTIVE: "Objectif",
  REMINDER: "Rappel",
  FINAL: "Clôture",
};

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<{
    templateId?: string;
    mode?: string;
    guildId?: string;
  }>;
}) {
  const sp = await searchParams;
  const guilds = await prisma.guildSettings.findMany({
    orderBy: { discordGuildId: "asc" },
    select: {
      id: true,
      discordGuildId: true,
      battleChannelId: true,
    },
  });
  const templates = await fetchBattleTemplatesForEventsWizard();

  const templatesMeta: Record<
    string,
    {
      phaseCount: number;
      durationSec: number;
      eventDurationMinutes: number;
    }
  > = {};
  const templatesPhasePreview: Record<
    string,
    { offsetLabel: string; typeLabel: string; title: string }[]
  > = {};

  const templatesLite = templates.map((t) => {
    const offs = t.events.map((e) => e.offsetSeconds);
    templatesMeta[t.id] = {
      phaseCount: t.events.length,
      durationSec: templateDurationSeconds(offs),
      eventDurationMinutes: t.eventDurationMinutes,
    };
    templatesPhasePreview[t.id] = t.events.slice(0, 8).map((e) => ({
      offsetLabel: formatOffsetLabel(e.offsetSeconds),
      typeLabel: PHASE_TYPE_FR[e.phaseType] ?? e.phaseType,
      title: e.title?.trim() || "Sans titre",
    }));
    return { id: t.id, name: t.name, guildId: t.guildId };
  });

  const channelsByGuildId: Record<string, { id: string; name: string }[]> = {};
  for (const g of guilds) {
    const raw = await fetchGuildTextChannels(g.discordGuildId);
    channelsByGuildId[g.id] = raw.map((c) => ({ id: c.id, name: c.name }));
  }

  return (
    <EventsWizard
      guilds={guilds}
      templates={templatesLite}
      templatesMeta={templatesMeta}
      templatesPhasePreview={templatesPhasePreview}
      channelsByGuildId={channelsByGuildId}
      discordConfigured={hasDiscordBotToken()}
      initialTemplateId={sp.templateId}
      initialGuildSettingsId={sp.guildId}
      scheduleMode={sp.mode === "schedule"}
    />
  );
}
