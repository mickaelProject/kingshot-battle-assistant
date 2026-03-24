import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import {
  OverviewActivityFeed,
  type OverviewActivityItem,
} from "@/components/overview-activity-feed";
import { SitrepBlock, type SitrepState } from "@/components/SitrepBlock";
import {
  StatGrid,
  type StatGridItem,
} from "@/components/StatGrid";
import { SectionCard } from "@/components/ui/section-card";
import {
  fetchGuildTextChannelOptionsByGuildId,
  hasDiscordBotToken,
} from "@/lib/discord-rest";
import {
  fetchOverviewActiveRun,
  type OverviewActiveRun,
} from "@/lib/overview-active-run";
import { prisma } from "@/lib/prisma";

function missionPhaseStats(run: OverviewActiveRun) {
  const reminders = run.session?.reminders ?? [];
  const phasesTotal =
    reminders.length > 0 ? reminders.length : run.template._count.events;
  const phasesDone = reminders.filter(
    (x) => x.status === "SENT" || x.status === "SKIPPED",
  ).length;
  const next = reminders.find((x) => x.status === "PENDING");
  return { phasesTotal, phasesDone, next };
}

export default async function OverviewPage() {
  const t = await getTranslations("overview");
  const ta = await getTranslations("activity");
  const locale = await getLocale();
  const botOk = hasDiscordBotToken();
  type OverviewLoadData = {
    guilds: {
      id: string;
      discordGuildId: string;
      battleChannelId: string | null;
      defaultTemplate: { name: string; id: string } | null;
    }[];
    nextRun: {
      id: string;
      scheduledAt: Date;
      template: { name: string };
      guild: { discordGuildId: string };
    } | null;
    activeRun: Awaited<ReturnType<typeof fetchOverviewActiveRun>>;
    rawActivity: {
      id: string;
      level: string;
      message: string;
      createdAt: Date;
      runId: string;
      run: { id: string; template: { name: string } | null };
    }[];
    templateCount: number;
    scheduledRunCount: number;
    totalRunCount: number;
    liveRunCount: number;
    channelOptionsByGuild: Map<string, { id: string; name: string }[]>;
  };
  let data: OverviewLoadData | null = null;

  try {
    const guilds = await prisma.guildSettings.findMany({
      orderBy: { discordGuildId: "asc" },
      include: {
        defaultTemplate: { select: { name: true, id: true } },
      },
    });
    const channelsPromise =
      botOk && guilds.length > 0
        ? fetchGuildTextChannelOptionsByGuildId(guilds)
        : Promise.resolve(new Map<string, { id: string; name: string }[]>());
    const [
      [
        nextRun,
        activeRun,
        rawActivity,
        templateCount,
        scheduledRunCount,
        totalRunCount,
        liveRunCount,
      ],
      channelOptionsByGuild,
    ] = await Promise.all([
      Promise.all([
        prisma.managedEventRun.findFirst({
          where: { status: "SCHEDULED" },
          orderBy: { scheduledAt: "asc" },
          /* select explicite : évite de lire les colonnes légion du run (P2022 si client/base désalignés). */
          select: {
            id: true,
            scheduledAt: true,
            template: { select: { name: true } },
            guild: { select: { discordGuildId: true } },
          },
        }),
        fetchOverviewActiveRun(),
        prisma.managedEventRunLog.findMany({
          orderBy: { createdAt: "desc" },
          take: 14,
          select: {
            id: true,
            level: true,
            message: true,
            createdAt: true,
            runId: true,
            run: {
              select: {
                id: true,
                template: { select: { name: true } },
              },
            },
          },
        }),
        prisma.battleTemplate.count(),
        prisma.managedEventRun.count({ where: { status: "SCHEDULED" } }),
        prisma.managedEventRun.count(),
        prisma.managedEventRun.count({
          where: { status: { in: ["STARTING", "ACTIVE"] } },
        }),
      ]),
      channelsPromise,
    ]);

    data = {
      guilds,
      nextRun,
      activeRun,
      rawActivity,
      templateCount,
      scheduledRunCount,
      totalRunCount,
      liveRunCount,
      channelOptionsByGuild,
    };
  } catch (error) {
    console.error("[dashboard] overview data load failed", error);
    return (
      <div className="dashboard-main dashboard-home max-w-[1200px]">
        <SectionCard
          title="Dashboard temporairement indisponible"
          subtitle="Connexion base de donnees impossible"
        >
          <p className="muted">
            Impossible de charger les donnees admin pour le moment. Verifie la
            connexion PostgreSQL puis recharge la page.
          </p>
          <p className="mt-3">
            <Link href="/dashboard/server" className="text-link">
              Ouvrir les parametres serveur
            </Link>
          </p>
        </SectionCard>
      </div>
    );
  }

  const {
    guilds,
    nextRun,
    activeRun,
    rawActivity,
    templateCount,
    scheduledRunCount,
    totalRunCount,
    liveRunCount,
    channelOptionsByGuild,
  } = data;

  const activityItems: OverviewActivityItem[] = rawActivity.map((log) => ({
    id: log.id,
    level: log.level,
    message: log.message,
    createdAt: log.createdAt,
    runId: log.runId,
    templateName: log.run.template?.name ?? null,
  }));

  const channelNameByGuild = new Map<string, Map<string, string>>();
  if (botOk) {
    for (const g of guilds) {
      const opts = channelOptionsByGuild.get(g.id) ?? [];
      channelNameByGuild.set(g.id, new Map(opts.map((c) => [c.id, c.name])));
    }
  }

  const channelsReady = guilds.filter((g) => Boolean(g.battleChannelId)).length;
  const serverStatusLabel =
    guilds.length === 0
      ? t("noServers")
      : channelsReady === guilds.length
        ? t("allChannelsReady")
        : t("someChannelsReady", {
            ready: channelsReady,
            total: guilds.length,
          });

  const liveServerOk =
    botOk && guilds.length > 0 && channelsReady === guilds.length;

  const nextScheduled =
    nextRun && !activeRun
      ? {
          id: nextRun.id,
          name: nextRun.template.name,
          atLabel: new Date(nextRun.scheduledAt).toLocaleString(locale),
        }
      : activeRun && nextRun && nextRun.id !== activeRun.id
        ? {
            id: nextRun.id,
            name: nextRun.template.name,
            atLabel: new Date(nextRun.scheduledAt).toLocaleString(locale),
          }
        : null;

  const phaseBlock = activeRun ? missionPhaseStats(activeRun) : null;
  const phasesTotal = phaseBlock?.phasesTotal ?? 0;
  const phasesDone = phaseBlock?.phasesDone ?? 0;
  const nextPhaseInSeconds =
    phaseBlock?.next?.scheduledAt != null
      ? Math.max(
          0,
          Math.floor(
            (phaseBlock.next.scheduledAt.getTime() - Date.now()) / 1000,
          ),
        )
      : null;

  let sitrepState: SitrepState = "idle";
  if (activeRun) {
    if (
      nextPhaseInSeconds != null &&
      nextPhaseInSeconds > 0 &&
      nextPhaseInSeconds < 300
    ) {
      sitrepState = "critical";
    } else {
      sitrepState = "active";
    }
  }

  const phaseIndex =
    activeRun && phasesTotal > 0
      ? Math.min(phasesDone + 1, phasesTotal)
      : 0;
  const nextTitle =
    phaseBlock?.next?.title || phaseBlock?.next?.phaseType || null;
  const progressPercent =
    phasesTotal > 0
      ? Math.min(100, Math.round((phasesDone / phasesTotal) * 100))
      : 0;

  const startedAtLabel =
    activeRun?.session?.startedAt != null
      ? new Date(activeRun.session.startedAt).toLocaleString(locale)
      : "—";

  const stats: StatGridItem[] = activeRun
    ? [
        {
          label: t("statEvent"),
          value: activeRun.template.name,
          sub: t("statEventSubActive", {
            minutes: activeRun.template.eventDurationMinutes,
            started: startedAtLabel,
          }),
          color: "amber",
        },
        {
          label: t("statPhase"),
          value: t("statPhaseSubActive", {
            index: phaseIndex,
            total: phasesTotal,
          }),
          sub: nextTitle ?? t("statPhaseNoActivity"),
          color:
            sitrepState === "critical"
              ? "red"
              : nextTitle
                ? "amber"
                : "muted",
        },
        {
          label: t("statParticipants"),
          value: "—",
          sub: t("statParticipantsSubActive"),
          color: "muted",
        },
        {
          label: t("statBot"),
          value: botOk ? t("statBotOk") : t("statBotErr"),
          sub: botOk ? t("workerReady") : t("checkConnection"),
          color: botOk ? "green" : "red",
        },
      ]
    : [
        {
          label: t("statModels"),
          value: String(templateCount),
          sub: t("statModelsSub"),
          color: templateCount > 0 ? "amber" : "muted",
        },
        {
          label: t("statRuns"),
          value: String(totalRunCount),
          sub: t("statRunsSub", { scheduled: scheduledRunCount }),
          color: "muted",
        },
        {
          label: t("statRunsLive"),
          value: String(liveRunCount),
          sub:
            liveRunCount > 0
              ? t("statRunsLiveSubActive")
              : t("statRunsLiveSubIdle"),
          color: liveRunCount > 0 ? "amber" : "muted",
        },
        {
          label: t("statBot"),
          value: botOk ? t("statBotOk") : t("statBotErr"),
          sub: botOk ? t("workerReady") : t("checkConnection"),
          color: botOk ? "green" : "red",
        },
      ];

  return (
    <div className="dashboard-main dashboard-home dashboard-home--cc max-w-[1200px]">
      <SitrepBlock
        state={sitrepState}
        eventName={activeRun?.template.name}
        phaseIndex={phaseIndex}
        totalPhases={phasesTotal}
        nextPhaseName={nextTitle}
        nextPhaseIn={nextPhaseInSeconds}
        progressPercent={progressPercent}
        nextScheduled={nextScheduled}
      />

      {activeRun ? (
        <p
          className="mb-3 text-center text-sm text-zinc-500"
          aria-label={t("countsSummaryAria", {
            models: templateCount,
            runs: totalRunCount,
            live: liveRunCount,
          })}
        >
          {t("countsSummaryInline", {
            models: templateCount,
            runs: totalRunCount,
            live: liveRunCount,
          })}
        </p>
      ) : null}

      <StatGrid items={stats} />

      {!liveServerOk ? (
        <div className="mb-8 rounded-lg border border-war-amber/25 bg-war-amber/5 px-4 py-3 text-sm text-zinc-300">
          <strong className="text-war-amber">{t("fieldStateTitle")}</strong>
          <span className="text-zinc-500"> — </span>
          {serverStatusLabel}
          {botOk ? "" : t("tokenMissing")}
          {" · "}
          <Link href="/dashboard/server" className="text-war-amber hover:underline">
            {t("serverSettingsLink")}
          </Link>
        </div>
      ) : null}

      <SectionCard
        title={t("activityTitle")}
        subtitle={t("activitySubtitle")}
        className="section-card--activity"
      >
        <OverviewActivityFeed
          items={activityItems}
          emptyTitle={ta("emptyTitle")}
          emptySub={
            templateCount > 0 ? ta("emptySubWithTemplates") : ta("emptySub")
          }
          openRunLabel={ta("openRun")}
          locale={locale}
        />
      </SectionCard>

      {guilds.length > 1 ? (
        <SectionCard title={t("serversTitle")} subtitle={t("serversSubtitle")}>
          <div className="server-grid">
            {guilds.map((g, idx) => {
              const cmap = channelNameByGuild.get(g.id);
              const chName =
                g.battleChannelId && cmap?.get(g.battleChannelId);
              return (
                <div key={g.id} className="server-card">
                  <div className="server-card__label">
                    {t("serverN", { n: idx + 1 })}
                  </div>
                  <p className="server-card__meta">
                    <span className="muted">{t("tacticalChannel")}</span>
                    {chName ? (
                      <strong>#{chName}</strong>
                    ) : g.battleChannelId ? (
                      <span className="muted">{t("channelConfigured")}</span>
                    ) : (
                      <span className="muted">{t("channelToDefine")}</span>
                    )}
                  </p>
                  <p className="server-card__meta muted">
                    {t("defaultTemplate")}
                    <strong>{g.defaultTemplate?.name ?? t("noTemplate")}</strong>
                  </p>
                  <Link href="/dashboard/server" className="text-link">
                    {t("settingsLink")}
                  </Link>
                </div>
              );
            })}
          </div>
        </SectionCard>
      ) : null}
    </div>
  );
}
