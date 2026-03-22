import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import type { AppLocale } from "@/i18n/config";
import { RunActiveControls } from "@/components/run-active-controls";
import type { RunDetailTabId } from "@/components/run-detail-tabs";
import { RunDetailTabs } from "@/components/run-detail-tabs";
import { RunMissionStrip } from "@/components/run-mission-strip";
import { RunPlayerLiveLink } from "@/components/run-player-live-link";
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

  const locale = (await getLocale()) as AppLocale;
  const t = await getTranslations("runs.detail");

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

  const defaultTab: RunDetailTabId = canControl ? "pilotage" : "timeline";

  const formatLegionUtc = (d: Date | null) =>
    d
      ? d.toLocaleString(locale, {
          timeZone: "UTC",
          dateStyle: "short",
          timeStyle: "short",
        }) + " UTC"
      : t("summaryLegionAligned");

  const pilotagePanel = canControl ? (
    <section className="control-deck" aria-label={t("controlTitle")}>
      <div className="control-deck__head">
        <h2 className="control-deck__title">{t("controlTitle")}</h2>
        <p className="control-deck__hint muted">{t("controlHint")}</p>
      </div>
      <RunActiveControls
        runId={run.id}
        isPaused={isPaused}
        redirectPath={`/dashboard/runs/${run.id}`}
      />
    </section>
  ) : (
    <p className="muted run-detail-tabs__idle">{t("pilotageIdle")}</p>
  );

  const timelinePanel = (
    <SectionCard
      title={t("timelineTitle")}
      subtitle={
        run.session ? t("timelineSubOn") : t("timelineSubOff")
      }
      className="section-card--timeline section-card--run-vt"
    >
      {!run.session || run.session.reminders.length === 0 ? (
        <p className="muted">
          {run.status === "SCHEDULED"
            ? t("timelineWaitBot")
            : t("timelineNoReminders")}
        </p>
      ) : (
        <RunVerticalTimeline
          runStatus={run.status}
          startedAt={run.session.startedAt}
          reminders={run.session.reminders}
        />
      )}
    </SectionCard>
  );

  const detailsPanel = (
    <div className="run-detail-tabs__details-stack">
      <SectionCard title={t("summaryTitle")}>
        <dl className="review-dl run-detail__dl">
          <dt>{t("summaryStatus")}</dt>
          <dd>
            <StatusBadge status={run.status} />
          </dd>
          <dt>{t("summaryPhases")}</dt>
          <dd>
            {phasesTotal > 0 ? (
              t("summaryPhasesDone", { done: phasesDone, total: phasesTotal })
            ) : (
              <span className="muted">—</span>
            )}
          </dd>
          <dt>{t("summaryDuration")}</dt>
          <dd>
            <strong>{run.template.eventDurationMinutes} min</strong>
          </dd>
          <dt>{t("summaryCoverage")}</dt>
          <dd>{formatDurationHuman(timelineLastSec, locale)}</dd>
          {run.legion1StartsAt != null || run.legion2StartsAt != null ? (
            <>
              <dt>{t("summaryLegion")}</dt>
              <dd>
                L1 : {formatLegionUtc(run.legion1StartsAt)}
                {" · "}
                L2 : {formatLegionUtc(run.legion2StartsAt)}
              </dd>
            </>
          ) : null}
        </dl>
        {run.errorMessage ? (
          <div className="run-error-block">
            <strong>{t("failHeading")}</strong>
            <p>{run.errorMessage}</p>
          </div>
        ) : null}
      </SectionCard>

      <SectionCard title={t("playerTitle")} subtitle={t("playerSub")}>
        <RunPlayerLiveLink runId={run.id} />
      </SectionCard>

      <SectionCard title={t("refTitle")} subtitle={t("refSub")}>
        <ul className="timeline-list timeline-list--compact">
          {run.template.events.map((ev, i) => (
            <li key={i} className="timeline-item timeline-item--ref">
              <div className="timeline-item__time">
                {formatOffsetLabel(ev.offsetSeconds, locale)}
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

      <SectionCard title={t("logTitle")} subtitle={t("logSub")}>
        {run.logs.length === 0 ? (
          <p className="muted">{t("logEmpty")}</p>
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
  );

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
          Départ prévu · {new Date(run.scheduledAt).toLocaleString(locale)}
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

      <RunDetailTabs
        defaultTab={defaultTab}
        pilotage={pilotagePanel}
        timeline={timelinePanel}
        details={detailsPanel}
      />
    </div>
  );
}
