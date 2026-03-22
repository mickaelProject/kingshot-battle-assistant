"use client";

import Link from "next/link";
import type { ManagedEventStatus } from "@prisma/client";
import { useLocale, useTranslations } from "next-intl";
import { cancelRunAction } from "@/actions/data";
import type { AppLocale } from "@/i18n/config";
import { RunActiveControls } from "@/components/run-active-controls";
import { RunMissionStrip } from "@/components/run-mission-strip";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import type { ManagedRunListRow } from "@/lib/managed-runs-queries";

function getStatusHint(
  t: (key: string) => string,
  status: ManagedEventStatus,
  errorMessage: string | null,
): string {
  switch (status) {
    case "SCHEDULED":
      return t("statusScheduled");
    case "STARTING":
      return t("statusStarting");
    case "ACTIVE":
      return t("statusActive");
    case "COMPLETED":
      return t("statusCompleted");
    case "FAILED":
      return errorMessage?.trim() || t("statusFailed");
    case "CANCELLED":
      return t("statusCancelled");
    default:
      return "";
  }
}

function RunCard({
  r,
  showCancel,
  history = false,
}: {
  r: ManagedRunListRow;
  showCancel: boolean;
  history?: boolean;
}) {
  const t = useTranslations("runs");
  const locale = useLocale() as AppLocale;
  const reminders = r.session?.reminders ?? [];
  const phasesTotal =
    reminders.length > 0
      ? reminders.length
      : r.template._count.events;
  const phasesDone = reminders.filter(
    (x) => x.status === "SENT" || x.status === "SKIPPED",
  ).length;
  const next = reminders.find((x) => x.status === "PENDING");
  const canControl =
    r.status === "ACTIVE" && Boolean(r.battleSessionId) && r.session;
  const isPaused = Boolean(r.session?.isPaused);
  const isMission = r.status === "ACTIVE" || r.status === "STARTING";

  return (
    <article
      className={`run-card run-card--${r.status.toLowerCase()} ${isMission ? "run-card--mission" : ""} ${history ? "run-card--history" : ""}`}
    >
      <div className="run-card__top">
        <div className="run-card__badges">
          <StatusBadge status={r.status} />
          {canControl && isPaused ? (
            <span className="badge run-card__paused-badge">{t("paused")}</span>
          ) : null}
        </div>
        <time className="run-card__time" dateTime={r.scheduledAt.toISOString()}>
          {new Date(r.scheduledAt).toLocaleString(locale)}
        </time>
      </div>
      <h3 className="run-card__template">{r.template.name}</h3>
      <p className="run-card__channel muted">
        {r.channelNameSnapshot ? (
          <>
            {t("channel")} <strong>#{r.channelNameSnapshot}</strong>
          </>
        ) : (
          t("channelFallback")
        )}
      </p>
      <p className="run-card__duration-hint muted">
        {t("durationPrefix")}{" "}
        <strong>{r.template.eventDurationMinutes} min</strong>
      </p>

      {isMission ? (
        <RunMissionStrip
          status={r.status}
          startedAtIso={r.session?.startedAt?.toISOString() ?? null}
          scheduledAtIso={r.scheduledAt.toISOString()}
          eventDurationMinutes={r.template.eventDurationMinutes}
          nextTitle={next?.title || next?.phaseType || null}
          nextAtIso={next?.scheduledAt?.toISOString() ?? null}
          phasesDone={phasesDone}
          phasesTotal={phasesTotal}
        />
      ) : null}

      <p className="run-card__hint muted">
        {getStatusHint(t, r.status, r.errorMessage)}
      </p>
      {r.status === "FAILED" && r.errorMessage ? (
        <p className="run-card__err">{r.errorMessage}</p>
      ) : null}
      {canControl ? (
        <div className="run-card__controls">
          <p className="field-hint">{t("liveCommands")}</p>
          <RunActiveControls
            runId={r.id}
            isPaused={isPaused}
            redirectPath="/dashboard/runs"
            compact
          />
        </div>
      ) : null}
      <div className="run-card__foot">
        <Link href={`/dashboard/runs/${r.id}`} className="btn btn-ghost btn-small">
          {t("open")}
        </Link>
        {showCancel ? (
          <form action={cancelRunAction}>
            <input type="hidden" name="id" value={r.id} />
            <button type="submit" className="btn btn-danger-ghost btn-small">
              {t("cancel")}
            </button>
          </form>
        ) : null}
      </div>
    </article>
  );
}

function RunSection({
  title,
  runs,
  showCancel,
  variant,
  history: historyCards = false,
  emptyTitle,
  emptyDescription,
  emptyHref,
  emptyActionLabel,
}: {
  title: string;
  runs: ManagedRunListRow[];
  showCancel: boolean;
  variant?: "mission";
  history?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyHref?: string;
  emptyActionLabel?: string;
}) {
  const t = useTranslations("runs");
  if (runs.length === 0) {
    return (
      <section className={`runs-section ${variant === "mission" ? "runs-section--mission" : ""}`}>
        <h2 className="runs-section__title">{title}</h2>
        <SectionCardShell>
          <EmptyState
            title={emptyTitle ?? t("emptyDefault")}
            description={emptyDescription}
            actionLabel={emptyActionLabel}
            actionHref={emptyHref}
          />
        </SectionCardShell>
      </section>
    );
  }
  return (
    <section className={`runs-section ${variant === "mission" ? "runs-section--mission" : ""}`}>
      <h2 className="runs-section__title">{title}</h2>
      <div className="run-card-grid">
        {runs.map((r) => (
          <RunCard
            key={r.id}
            r={r}
            showCancel={showCancel}
            history={historyCards}
          />
        ))}
      </div>
    </section>
  );
}

function SectionCardShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="section-card runs-empty-card">
      <div className="section-card__body">{children}</div>
    </div>
  );
}

export function RunsDashboardClient({ runs }: { runs: ManagedRunListRow[] }) {
  const t = useTranslations("runs");

  const scheduled = runs.filter((r) => r.status === "SCHEDULED");
  const starting = runs.filter((r) => r.status === "STARTING");
  const active = runs.filter((r) => r.status === "ACTIVE");
  const inFlight = [...starting, ...active];
  const done = runs.filter((r) =>
    ["COMPLETED", "FAILED", "CANCELLED"].includes(r.status),
  );

  return (
    <div className="dashboard-main runs-dashboard runs-dashboard--premium">
      <PageHeader
        title={t("pageTitle")}
        description={t("pageDesc")}
        actions={
          <Link href="/dashboard/events" className="btn btn-primary">
            {t("newEvent")}
          </Link>
        }
      />

      <RunSection
        title={t("scheduled", { count: scheduled.length })}
        runs={scheduled}
        showCancel
        emptyTitle={t("emptyScheduledTitle")}
        emptyDescription={t("emptyScheduledDesc")}
        emptyHref="/dashboard/events?mode=schedule"
        emptyActionLabel={t("emptyScheduledAction")}
      />
      <RunSection
        title={t("inFlight", { count: inFlight.length })}
        runs={inFlight}
        showCancel={false}
        variant="mission"
        emptyTitle={t("emptyLiveTitle")}
        emptyDescription={t("emptyLiveDesc")}
        emptyHref="/dashboard/events"
        emptyActionLabel={t("emptyLiveAction")}
      />
      <RunSection
        title={t("history", { count: done.length })}
        runs={done}
        showCancel={false}
        history
        emptyTitle={t("emptyHistoryTitle")}
        emptyDescription={t("emptyHistoryDesc")}
      />
    </div>
  );
}
