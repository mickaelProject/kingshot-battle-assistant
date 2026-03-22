import { getLocale } from "next-intl/server";
import {
  fetchGuildTextChannelOptionsByGuildId,
  hasDiscordBotToken,
} from "@/lib/discord-rest";
import { fetchBattleTemplatesForEventsWizard } from "@/lib/battle-templates-queries";
import type { AppLocale } from "@/i18n/config";
import {
  getDiscordBotInviteUrl,
  getDiscordInstallRedirectUri,
} from "@/lib/discord-invite";
import { prisma } from "@/lib/prisma";
import {
  formatOffsetLabel,
  templateDurationSeconds,
} from "@/lib/time-human";
import { EventsWizard } from "./events-wizard";

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
  const locale = (await getLocale()) as AppLocale;
  const discordInviteUrl = getDiscordBotInviteUrl();
  const discordInstallRedirectUri = getDiscordInstallRedirectUri();
  const guildsPromise = prisma.guildSettings.findMany({
    orderBy: { discordGuildId: "asc" },
    select: {
      id: true,
      discordGuildId: true,
      battleChannelId: true,
    },
  });
  const templatesPromise = fetchBattleTemplatesForEventsWizard();
  const guilds = await guildsPromise;
  const [templates, channelMap] = await Promise.all([
    templatesPromise,
    fetchGuildTextChannelOptionsByGuildId(guilds),
  ]);

  const templatesMeta: Record<
    string,
    {
      phaseCount: number;
      durationSec: number;
      eventDurationMinutes: number;
      hasLegionPhases: boolean;
      legionTimelinesNeedSchedule: boolean;
      legion1StartOffsetMinutes: number;
      legion2StartOffsetMinutes: number;
    }
  > = {};
  const templatesPhasePreview: Record<
    string,
    { offsetLabel: string; phaseType: string; title: string }[]
  > = {};

  const templatesLite = templates.map((t) => {
    const discordPhases = t.events.filter((e) => e.timelineScope === "GLOBAL");
    const phasesForStats =
      discordPhases.length > 0 ? discordPhases : t.events;
    const offs = phasesForStats.map((e) => e.offsetSeconds);
    const hasLegionPhases = t.events.some(
      (e) =>
        e.timelineScope === "LEGION_1" || e.timelineScope === "LEGION_2",
    );
    const hasLegion1Timeline = t.events.some(
      (e) => e.timelineScope === "LEGION_1",
    );
    const hasLegion2Timeline = t.events.some(
      (e) => e.timelineScope === "LEGION_2",
    );
    /** Deux timelines légion distinctes → départ alliance explicite (pas « tout de suite »). */
    const legionTimelinesNeedSchedule =
      hasLegion1Timeline && hasLegion2Timeline;
    templatesMeta[t.id] = {
      phaseCount: phasesForStats.length,
      durationSec: templateDurationSeconds(offs),
      eventDurationMinutes: t.eventDurationMinutes,
      hasLegionPhases,
      legionTimelinesNeedSchedule,
      legion1StartOffsetMinutes: t.legion1StartOffsetMinutes,
      legion2StartOffsetMinutes: t.legion2StartOffsetMinutes,
    };
    templatesPhasePreview[t.id] = phasesForStats.slice(0, 8).map((e) => ({
      offsetLabel: formatOffsetLabel(e.offsetSeconds, locale),
      phaseType: e.phaseType,
      title: e.title?.trim() ?? "",
    }));
    return { id: t.id, name: t.name, guildId: t.guildId };
  });

  const channelsByGuildId: Record<string, { id: string; name: string }[]> =
    Object.fromEntries(channelMap);

  return (
    <EventsWizard
      guilds={guilds}
      templates={templatesLite}
      templatesMeta={templatesMeta}
      templatesPhasePreview={templatesPhasePreview}
      channelsByGuildId={channelsByGuildId}
      discordConfigured={hasDiscordBotToken()}
      discordInviteUrl={discordInviteUrl}
      discordInstallRedirectUri={discordInstallRedirectUri}
      initialTemplateId={sp.templateId}
      initialGuildSettingsId={sp.guildId}
      scheduleMode={sp.mode === "schedule"}
    />
  );
}
