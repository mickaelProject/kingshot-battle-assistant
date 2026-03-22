import Link from "next/link";
import {
  OverviewActivityFeed,
  type OverviewActivityItem,
} from "@/components/overview-activity-feed";
import { RunMissionStrip } from "@/components/run-mission-strip";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionCard } from "@/components/ui/section-card";
import { StatCard } from "@/components/ui/stat-card";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  fetchGuildTextChannelOptionsByGuildId,
  hasDiscordBotToken,
} from "@/lib/discord-rest";
import {
  fetchOverviewActiveRun,
  type OverviewActiveRun,
} from "@/lib/overview-active-run";
import { prisma } from "@/lib/prisma";

function ActiveEventBody({ run }: { run: OverviewActiveRun }) {
  const reminders = run.session?.reminders ?? [];
  const phasesTotal =
    reminders.length > 0 ? reminders.length : run.template._count.events;
  const phasesDone = reminders.filter(
    (x) => x.status === "SENT" || x.status === "SKIPPED",
  ).length;
  const next = reminders.find((x) => x.status === "PENDING");

  return (
    <div className="overview-mission overview-mission--hero">
      <div className="overview-highlight__top">
        <StatusBadge status={run.status} />
        <span className="muted">
          {run.channelNameSnapshot ? (
            <>
              Canal <strong>#{run.channelNameSnapshot}</strong>
            </>
          ) : (
            "Canal configuré"
          )}
        </span>
      </div>
      <p className="overview-highlight__title overview-highlight__title--xl">
        {run.template.name}
      </p>
      <RunMissionStrip
        status={run.status}
        startedAtIso={run.session?.startedAt?.toISOString() ?? null}
        scheduledAtIso={run.scheduledAt.toISOString()}
        eventDurationMinutes={run.template.eventDurationMinutes}
        nextTitle={next?.title || next?.phaseType || null}
        nextAtIso={next?.scheduledAt?.toISOString() ?? null}
        phasesDone={phasesDone}
        phasesTotal={phasesTotal}
      />
      <Link
        href="/dashboard/runs"
        className="btn btn-primary overview-mission__cta"
      >
        Piloter en direct
      </Link>
    </div>
  );
}

export default async function OverviewPage() {
  const botOk = hasDiscordBotToken();

  const [
    nextRun,
    activeRun,
    guilds,
    templateCount,
    rawActivity,
  ] = await Promise.all([
    prisma.managedEventRun.findFirst({
      where: { status: "SCHEDULED" },
      orderBy: { scheduledAt: "asc" },
      include: {
        template: { select: { name: true } },
        guild: { select: { discordGuildId: true } },
      },
    }),
    fetchOverviewActiveRun(),
    prisma.guildSettings.findMany({
      orderBy: { discordGuildId: "asc" },
      include: {
        defaultTemplate: { select: { name: true, id: true } },
      },
    }),
    prisma.battleTemplate.count(),
    prisma.managedEventRunLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 14,
      include: {
        run: { select: { id: true, template: { select: { name: true } } } },
      },
    }),
  ]);

  const activityItems: OverviewActivityItem[] = rawActivity.map((log) => ({
    id: log.id,
    level: log.level,
    message: log.message,
    createdAt: log.createdAt,
    runId: log.runId,
    templateName: log.run.template?.name ?? null,
  }));

  const channelOptionsByGuild =
    botOk && guilds.length > 0
      ? await fetchGuildTextChannelOptionsByGuildId(guilds)
      : new Map<string, { id: string; name: string }[]>();
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
      ? "Aucun serveur relié"
      : channelsReady === guilds.length
        ? "Tous les canaux tactiques sont prêts"
        : `${channelsReady} / ${guilds.length} canal${guilds.length > 1 ? "x" : ""} défini${guilds.length > 1 ? "s" : ""}`;

  const liveServerOk = botOk && guilds.length > 0 && channelsReady === guilds.length;

  return (
    <div className="dashboard-main dashboard-home dashboard-home--cc">
      <section className="cc-hero">
        <div className="cc-hero__grid">
          <div className="cc-hero__copy">
            <p className="cc-hero__eyebrow">Command Center</p>
            <h1 className="cc-hero__title">Votre bataille, en temps réel</h1>
            <p className="cc-hero__desc muted">
              Un seul écran pour lancer, suivre et ajuster la mission — sans
              jargon technique.
            </p>
            <div className="cc-hero__actions">
              <Link href="/dashboard/events" className="btn btn-primary">
                Lancer un événement
              </Link>
              <Link
                href="/dashboard/events?mode=schedule"
                className="btn btn-secondary"
              >
                Planifier
              </Link>
              <Link href="/dashboard/templates/new" className="btn btn-ghost">
                Nouveau modèle
              </Link>
            </div>
          </div>
          <div className="cc-hero__status-card">
            <p className="cc-hero__status-label">État du terrain</p>
            <div
              className={`cc-live-ring ${liveServerOk ? "cc-live-ring--ok" : "cc-live-ring--warn"}`}
            >
              <span className="cc-live-ring__pulse" aria-hidden />
              <div className="cc-live-ring__body">
                <strong className="cc-live-ring__title">
                  {liveServerOk ? "Opérationnel" : "Attention requise"}
                </strong>
                <p className="cc-live-ring__meta muted">
                  {botOk ? "Bot connecté (token présent)" : "Token bot manquant"}
                  <br />
                  {serverStatusLabel}
                </p>
                <Link href="/dashboard/server" className="text-link cc-live-ring__link">
                  Réglages serveur
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="stats-grid stats-grid--cockpit stats-grid--cc">
        <SectionCard title="Événement en cours" className="section-card--glow">
          {activeRun ? (
            <ActiveEventBody run={activeRun} />
          ) : (
            <EmptyState
              title="Pas de bataille active"
              description="Dès qu’une mission tourne, la progression et la prochaine annonce s’affichent ici."
              actionLabel="Lancer une mission"
              actionHref="/dashboard/events"
            />
          )}
        </SectionCard>

        <SectionCard title="Prochaine mission">
          {nextRun ? (
            <div className="overview-highlight">
              <div className="overview-highlight__top">
                <StatusBadge status={nextRun.status} />
                <span className="muted">
                  {new Date(nextRun.scheduledAt).toLocaleString()}
                </span>
              </div>
              <p className="overview-highlight__title">{nextRun.template.name}</p>
              {nextRun.channelNameSnapshot ? (
                <p className="muted">
                  Canal · <strong>#{nextRun.channelNameSnapshot}</strong>
                </p>
              ) : null}
              <div className="overview-card-actions">
                <Link
                  href={`/dashboard/runs/${nextRun.id}`}
                  className="btn btn-secondary btn-small"
                >
                  Gérer
                </Link>
              </div>
            </div>
          ) : (
            <EmptyState
              title="Aucune mission planifiée"
              description="Choisissez une date ou lancez immédiatement depuis Événements."
              actionLabel="Planifier ou lancer"
              actionHref="/dashboard/events"
            />
          )}
        </SectionCard>

        <SectionCard title="Modèles">
          <StatCard
            label="Scénarios enregistrés"
            value={<span className="stat-xl">{templateCount}</span>}
            hint="Timelines réutilisables pour vos batailles"
          />
          <Link
            href="/dashboard/templates"
            className="text-link"
            style={{ marginTop: "0.85rem", display: "inline-block" }}
          >
            Bibliothèque de modèles →
          </Link>
        </SectionCard>

        <SectionCard title="Système">
          <ul className="status-checklist">
            <li>
              <span
                className={`status-dot ${botOk ? "status-dot--ok" : "status-dot--warn"}`}
                aria-hidden
              />
              <span>
                <strong>Bot Discord</strong>
                <span className="muted">
                  {botOk ? " — prêt à exécuter" : " — configuration incomplète"}
                </span>
              </span>
            </li>
            <li>
              <span
                className={`status-dot ${guilds.length > 0 ? "status-dot--ok" : "status-dot--warn"}`}
                aria-hidden
              />
              <span>
                <strong>Serveurs</strong>
                <span className="muted"> — {serverStatusLabel}</span>
              </span>
            </li>
          </ul>
          {guilds.length > 0 ? (
            <Link href="/dashboard/server" className="text-link">
              Paramètres →
            </Link>
          ) : null}
        </SectionCard>
      </div>

      <SectionCard
        title="Fil d’activité"
        subtitle="Dernières traces techniques (sessions, phases, statuts)."
        className="section-card--activity"
      >
        <OverviewActivityFeed items={activityItems} />
      </SectionCard>

      {guilds.length > 1 ? (
        <SectionCard
          title="Vos serveurs Discord"
          subtitle="Chaque serveur a son canal tactique et son modèle par défaut."
        >
          <div className="server-grid">
            {guilds.map((g, idx) => {
              const cmap = channelNameByGuild.get(g.id);
              const chName =
                g.battleChannelId && cmap?.get(g.battleChannelId);
              return (
                <div key={g.id} className="server-card">
                  <div className="server-card__label">Serveur {idx + 1}</div>
                  <p className="server-card__meta">
                    <span className="muted">Canal tactique · </span>
                    {chName ? (
                      <strong>#{chName}</strong>
                    ) : g.battleChannelId ? (
                      <span className="muted">configuré</span>
                    ) : (
                      <span className="muted">à définir</span>
                    )}
                  </p>
                  <p className="server-card__meta muted">
                    Modèle par défaut ·{" "}
                    <strong>{g.defaultTemplate?.name ?? "Aucun"}</strong>
                  </p>
                  <Link href="/dashboard/server" className="text-link">
                    Réglages →
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
