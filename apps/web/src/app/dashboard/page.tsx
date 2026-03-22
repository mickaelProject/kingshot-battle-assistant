import Link from "next/link";
import { RunMissionStrip } from "@/components/run-mission-strip";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { StatCard } from "@/components/ui/stat-card";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  fetchGuildTextChannels,
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
    <div className="overview-mission">
      <div className="overview-highlight__top">
        <StatusBadge status={run.status} />
        <span className="muted">
          {run.channelNameSnapshot ? (
            <>
              Salon <strong>#{run.channelNameSnapshot}</strong>
            </>
          ) : (
            "Salon configuré"
          )}
        </span>
      </div>
      <p className="overview-highlight__title">{run.template.name}</p>
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
      <Link href="/dashboard/runs" className="btn btn-primary overview-mission__cta">
        Piloter l’événement
      </Link>
    </div>
  );
}

export default async function OverviewPage() {
  const botOk = hasDiscordBotToken();

  const [nextRun, activeRun, guilds, templateCount] = await Promise.all([
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
        templates: { select: { id: true } },
      },
    }),
    prisma.battleTemplate.count(),
  ]);

  const channelNameByGuild = new Map<string, Map<string, string>>();
  if (botOk) {
    for (const g of guilds) {
      const chans = await fetchGuildTextChannels(g.discordGuildId);
      const m = new Map(chans.map((c) => [c.id, c.name]));
      channelNameByGuild.set(g.id, m);
    }
  }

  const channelsReady = guilds.filter((g) => Boolean(g.battleChannelId)).length;
  const serverStatusLabel =
    guilds.length === 0
      ? "Aucun serveur relié"
      : channelsReady === guilds.length
        ? "Salons tactiques prêts"
        : `${channelsReady} / ${guilds.length} salon${guilds.length > 1 ? "s" : ""} défini${guilds.length > 1 ? "s" : ""}`;

  return (
    <div className="dashboard-main dashboard-home">
      <PageHeader
        emphasis="hero"
        title="Centre de contrôle bataille"
        description="Gérez les batailles de votre alliance au même endroit — sans jargon technique."
        actions={
          <div className="btn-row btn-row--hero">
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
              Créer un modèle
            </Link>
          </div>
        }
      />

      <div className="stats-grid stats-grid--cockpit">
        <SectionCard title="Événement en cours" className="section-card--glow">
          {activeRun ? (
            <ActiveEventBody run={activeRun} />
          ) : (
            <EmptyState
              title="Aucun événement actif"
              description="Quand une bataille tourne, progression et prochaine annonce s’affichent ici."
              actionLabel="Lancer ou planifier"
              actionHref="/dashboard/events"
            />
          )}
        </SectionCard>

        <SectionCard title="Prochain événement planifié">
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
                  Salon · <strong>#{nextRun.channelNameSnapshot}</strong>
                </p>
              ) : null}
              <div className="overview-card-actions">
                <Link
                  href={`/dashboard/runs/${nextRun.id}`}
                  className="btn btn-secondary btn-small"
                >
                  Modifier / gérer
                </Link>
              </div>
            </div>
          ) : (
            <EmptyState
              title="Rien de planifié"
              description="Ajoutez une date ou lancez tout de suite depuis Événements."
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
            Gérer les modèles →
          </Link>
        </SectionCard>

        <SectionCard title="État du système">
          <ul className="status-checklist">
            <li>
              <span
                className={`status-dot ${botOk ? "status-dot--ok" : "status-dot--warn"}`}
                aria-hidden
              />
              <span>
                <strong>Connexion bot</strong>
                <span className="muted">
                  {botOk ? " — opérationnelle" : " — token manquant côté admin"}
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
              Ouvrir les réglages serveur →
            </Link>
          ) : null}
        </SectionCard>
      </div>

      {guilds.length > 1 ? (
        <SectionCard
          title="Vos serveurs Discord"
          subtitle="Chaque serveur a ses propres réglages (salon, modèle par défaut)."
        >
          <div className="server-grid">
            {guilds.map((g, idx) => {
              const cmap = channelNameByGuild.get(g.id);
              const chName =
                g.battleChannelId && cmap?.get(g.battleChannelId);
              return (
                <div key={g.id} className="server-card">
                  <div className="server-card__label">
                    Serveur {idx + 1}
                  </div>
                  <p className="server-card__meta">
                    <span className="muted">Salon tactique · </span>
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
