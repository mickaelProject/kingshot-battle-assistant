import Link from "next/link";
import { notFound } from "next/navigation";
import { RunActiveControls } from "@/components/run-active-controls";
import { RunMissionStrip } from "@/components/run-mission-strip";
import { RunVerticalTimeline } from "@/components/run-vertical-timeline";
import { SectionCard } from "@/components/ui/section-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { fetchManagedRunForDetailPage } from "@/lib/managed-runs-queries";
import { formatDurationHuman, formatOffsetLabel } from "@/lib/time-human";

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
    <div className="dashboard-main run-detail run-detail--immersive">
      <p className="run-detail__back">
        <Link href="/dashboard/runs" className="text-link">
          ← Exécutions
        </Link>
      </p>

      <header className="run-detail-hero">
        <div className="run-detail-hero__top">
          <StatusBadge status={run.status} />
          {canControl && isPaused ? (
            <span className="run-detail-hero__paused">Timers en pause</span>
          ) : null}
        </div>
        <h1 className="run-detail-hero__title">{run.template.name}</h1>
        <p className="run-detail-hero__meta muted">
          Départ prévu · {new Date(run.scheduledAt).toLocaleString()}
          {run.channelNameSnapshot ? (
            <>
              {" "}
              · Canal <strong>#{run.channelNameSnapshot}</strong>
            </>
          ) : null}
        </p>
        {["ACTIVE", "STARTING"].includes(run.status) ? (
          <div className="run-detail-hero__strip">
            <RunMissionStrip
              status={run.status}
              startedAtIso={run.session?.startedAt?.toISOString() ?? null}
              scheduledAtIso={run.scheduledAt.toISOString()}
              eventDurationMinutes={run.template.eventDurationMinutes}
              nextTitle={nextPending?.title || nextPending?.phaseType || null}
              nextAtIso={nextPending?.scheduledAt?.toISOString() ?? null}
              phasesDone={phasesDone}
              phasesTotal={phasesTotal}
            />
          </div>
        ) : null}
      </header>

      {canControl ? (
        <section className="control-deck" aria-label="Contrôle mission">
          <div className="control-deck__head">
            <h2 className="control-deck__title">Console tactique</h2>
            <p className="control-deck__hint muted">
              Pause, reprise, phase suivante ou arrêt — exécuté par le bot sur
              l’API locale.
            </p>
          </div>
          <RunActiveControls
            runId={run.id}
            isPaused={isPaused}
            redirectPath={`/dashboard/runs/${run.id}`}
          />
        </section>
      ) : null}

      <div className="run-detail__grid run-detail__grid--split">
        <SectionCard
          title="Timeline mission"
          subtitle={
            run.session
              ? "Phases Discord — la ligne mise en avant est la phase active ou la prochaine."
              : "La timeline apparaît quand la session est créée."
          }
          className="section-card--timeline section-card--run-vt"
        >
          {!run.session || run.session.reminders.length === 0 ? (
            <p className="muted">
              {run.status === "SCHEDULED"
                ? "Session pas encore créée — le bot initialisera la timeline au lancement."
                : "Aucun rappel en base pour cette session."}
            </p>
          ) : (
            <RunVerticalTimeline
              runStatus={run.status}
              startedAt={run.session.startedAt}
              reminders={run.session.reminders}
            />
          )}
        </SectionCard>

        <div className="run-detail__aside">
          <SectionCard title="Synthèse">
            <dl className="review-dl run-detail__dl">
              <dt>Statut</dt>
              <dd>
                <StatusBadge status={run.status} />
              </dd>
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
              <dt>Durée événement (terrain)</dt>
              <dd>
                <strong>{run.template.eventDurationMinutes} min</strong>
              </dd>
              <dt>Couverture annonces</dt>
              <dd>{formatDurationHuman(timelineLastSec)}</dd>
            </dl>
            {run.errorMessage ? (
              <div className="run-error-block">
                <strong>Échec</strong>
                <p>{run.errorMessage}</p>
              </div>
            ) : null}
          </SectionCard>

          <SectionCard
            title="Modèle (référence)"
            subtitle="Plan théorique pour comparaison."
          >
            <ul className="timeline-list timeline-list--compact">
              {run.template.events.map((ev, i) => (
                <li key={i} className="timeline-item timeline-item--ref">
                  <div className="timeline-item__time">
                    {formatOffsetLabel(ev.offsetSeconds)}
                  </div>
                  <div className="timeline-item__body">
                    <span className="timeline-item__type muted">
                      {ev.phaseType}
                    </span>
                    <div className="timeline-item__title">{ev.title}</div>
                  </div>
                </li>
              ))}
            </ul>
          </SectionCard>

          <SectionCard title="Journal technique" subtitle="Ordre chronologique.">
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
    </div>
  );
}
