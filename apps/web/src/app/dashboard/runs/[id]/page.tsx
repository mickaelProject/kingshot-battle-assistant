import Link from "next/link";
import { notFound } from "next/navigation";
import { RunActiveControls } from "@/components/run-active-controls";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { fetchManagedRunForDetailPage } from "@/lib/managed-runs-queries";
import { RunMissionStrip } from "@/components/run-mission-strip";
import { formatDurationHuman, formatOffsetLabel } from "@/lib/time-human";

const reminderStatusLabel: Record<string, string> = {
  PENDING: "En attente",
  PROCESSING: "Envoi…",
  SENT: "Envoyé",
  SKIPPED: "Ignoré",
};

export default async function RunDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const run = await fetchManagedRunForDetailPage(id);
  if (!run) notFound();

  const reminders = run.session?.reminders ?? [];
  const nextPending = reminders.find((x) => x.status === "PENDING");
  const phasesTotal =
    reminders.length > 0 ? reminders.length : run.template.events.length;
  const phasesDone = reminders.filter(
    (x) => x.status === "SENT" || x.status === "SKIPPED",
  ).length;
  const timelineLastSec =
    run.template.events.length > 0
      ? Math.max(...run.template.events.map((e) => e.offsetSeconds))
      : 0;
  const canControl =
    run.status === "ACTIVE" && Boolean(run.battleSessionId) && run.session;
  const isPaused = Boolean(run.session?.isPaused);

  return (
    <div className="dashboard-main run-detail">
      <p className="run-detail__back">
        <Link href="/dashboard/runs" className="text-link">
          ← Exécutions
        </Link>
      </p>
      <PageHeader
        title={run.template.name}
        description="Résumé, timeline Discord et journal technique."
      />

      <div className="run-detail__grid">
        <SectionCard title="Résumé">
          <dl className="review-dl run-detail__dl">
            <dt>Statut</dt>
            <dd>
              <StatusBadge status={run.status} />
            </dd>
            <dt>Départ prévu</dt>
            <dd>{new Date(run.scheduledAt).toLocaleString()}</dd>
            <dt>Salon</dt>
            <dd>
              {run.channelNameSnapshot ? (
                <strong>#{run.channelNameSnapshot}</strong>
              ) : (
                <span className="muted">Salon enregistré</span>
              )}
            </dd>
            <dt>Durée événement (modèle)</dt>
            <dd>
              <strong>{run.template.eventDurationMinutes} min</strong>
              <span className="muted">
                {" "}
                — in-game, distinct des annonces Discord
              </span>
            </dd>
            <dt>Couverture annonces (T+ max)</dt>
            <dd>{formatDurationHuman(timelineLastSec)}</dd>
            <dt>Phases annonces</dt>
            <dd>
              {phasesTotal > 0 ? (
                <>
                  {phasesDone} / {phasesTotal} traitées
                </>
              ) : (
                <span className="muted">—</span>
              )}
            </dd>
            {nextPending && ["ACTIVE", "STARTING"].includes(run.status) ? (
              <>
                <dt>Prochain message</dt>
                <dd>
                  <strong>{nextPending.title || nextPending.phaseType}</strong>
                  <span className="muted">
                    {" "}
                    ·{" "}
                    {new Date(nextPending.scheduledAt).toLocaleString()}
                  </span>
                </dd>
              </>
            ) : null}
            {canControl ? (
              <>
                <dt>Timers Discord</dt>
                <dd>
                  {isPaused ? (
                    <span className="badge run-card__paused-badge">En pause</span>
                  ) : (
                    <span className="muted">Actifs</span>
                  )}
                </dd>
              </>
            ) : null}
          </dl>
          {run.errorMessage ? (
            <div className="run-error-block">
              <strong>Détail de l’échec</strong>
              <p>{run.errorMessage}</p>
            </div>
          ) : null}
          {["ACTIVE", "STARTING"].includes(run.status) ? (
            <div style={{ marginTop: "1rem" }}>
              <RunMissionStrip
                status={run.status}
                startedAtIso={run.session?.startedAt?.toISOString() ?? null}
                scheduledAtIso={run.scheduledAt.toISOString()}
                eventDurationMinutes={run.template.eventDurationMinutes}
                nextTitle={
                  nextPending?.title || nextPending?.phaseType || null
                }
                nextAtIso={nextPending?.scheduledAt?.toISOString() ?? null}
                phasesDone={phasesDone}
                phasesTotal={phasesTotal}
              />
            </div>
          ) : null}
        </SectionCard>

        {canControl ? (
          <SectionCard
            title="Contrôle en direct"
            subtitle="Pause, reprise, envoi immédiat de la prochaine phase, ou arrêt — exécuté par le bot (API locale BOT_CONTROL)."
          >
            <RunActiveControls
              runId={run.id}
              isPaused={isPaused}
              redirectPath={`/dashboard/runs/${run.id}`}
            />
          </SectionCard>
        ) : null}

        <SectionCard
          title="Timeline Discord"
          subtitle={
            run.session
              ? "Messages planifiés pour cette session (état réel côté bot)."
              : "La timeline apparaît quand la session est créée."
          }
        >
          {!run.session || run.session.reminders.length === 0 ? (
            <p className="muted">
              {run.status === "SCHEDULED"
                ? "Pas encore de session — le bot créera la timeline au lancement."
                : "Aucun rappel en base pour cette session."}
            </p>
          ) : (
            <ul className="timeline-list">
              {run.session.reminders.map((rem) => (
                <li
                  key={rem.id}
                  className={`timeline-item timeline-item--${rem.status.toLowerCase()}`}
                >
                  <div className="timeline-item__time">
                    {new Date(rem.scheduledAt).toLocaleString()}
                  </div>
                  <div className="timeline-item__body">
                    <span className="timeline-item__badge">
                      {reminderStatusLabel[rem.status] ?? rem.status}
                    </span>
                    <span className="timeline-item__type muted">
                      {rem.phaseType}
                    </span>
                    <div className="timeline-item__title">{rem.title || "—"}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard
          title="Modèle (référence)"
          subtitle="Phases du modèle — pour comparaison avec la timeline réelle."
        >
          <ul className="timeline-list timeline-list--compact">
            {run.template.events.map((ev, i) => (
              <li key={i} className="timeline-item timeline-item--ref">
                <div className="timeline-item__time">
                  {formatOffsetLabel(ev.offsetSeconds)}
                </div>
                <div className="timeline-item__body">
                  <span className="timeline-item__type muted">{ev.phaseType}</span>
                  <div className="timeline-item__title">{ev.title}</div>
                </div>
              </li>
            ))}
          </ul>
        </SectionCard>

        <SectionCard
          title="Journal"
          subtitle="Traces techniques (ordre chronologique)."
        >
          {run.logs.length === 0 ? (
            <p className="muted">Aucune entrée.</p>
          ) : (
            <ul className="run-log-list run-log-list--detail">
              {run.logs.map((log) => (
                <li key={log.id} className={`run-log run-log--${log.level}`}>
                  <time dateTime={log.createdAt.toISOString()}>
                    {new Date(log.createdAt).toLocaleString()}
                  </time>
                  <span className="run-log__level">{log.level}</span>
                  <span className="run-log__msg">{log.message}</span>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
