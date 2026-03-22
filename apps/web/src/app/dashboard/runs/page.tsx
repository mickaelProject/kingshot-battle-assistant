import Link from "next/link";
import type { ManagedEventStatus } from "@prisma/client";
import { cancelRunAction } from "@/actions/data";
import { RunActiveControls } from "@/components/run-active-controls";
import { RunMissionStrip } from "@/components/run-mission-strip";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  fetchManagedRunsForList,
  type ManagedRunListRow,
} from "@/lib/managed-runs-queries";

function statusHint(
  status: ManagedEventStatus,
  errorMessage: string | null,
): string {
  switch (status) {
    case "SCHEDULED":
      return "En attente de l’heure prévue.";
    case "STARTING":
      return "Le bot prépare la session et les rappels.";
    case "ACTIVE":
      return "Les annonces partent selon la timeline du modèle.";
    case "COMPLETED":
      return "Bataille terminée.";
    case "FAILED":
      return errorMessage?.trim() || "Une erreur est survenue.";
    case "CANCELLED":
      return "Annulé ou arrêté manuellement.";
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
            <span className="badge run-card__paused-badge">En pause</span>
          ) : null}
        </div>
        <time className="run-card__time" dateTime={r.scheduledAt.toISOString()}>
          {new Date(r.scheduledAt).toLocaleString()}
        </time>
      </div>
      <h3 className="run-card__template">{r.template.name}</h3>
      <p className="run-card__channel muted">
        {r.channelNameSnapshot ? (
          <>
            Salon <strong>#{r.channelNameSnapshot}</strong>
          </>
        ) : (
          <>Salon configuré</>
        )}
      </p>
      <p className="run-card__duration-hint muted">
        Durée sur le terrain ·{" "}
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

      <p className="run-card__hint muted">{statusHint(r.status, r.errorMessage)}</p>
      {r.status === "FAILED" && r.errorMessage ? (
        <p className="run-card__err">{r.errorMessage}</p>
      ) : null}
      {canControl ? (
        <div className="run-card__controls">
          <p className="field-hint">Commandes en direct</p>
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
          Ouvrir
        </Link>
        {showCancel ? (
          <form action={cancelRunAction}>
            <input type="hidden" name="id" value={r.id} />
            <button type="submit" className="btn btn-danger-ghost btn-small">
              Annuler
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
  /** Cartes historique (style plus discret). */
  history?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyHref?: string;
  emptyActionLabel?: string;
}) {
  if (runs.length === 0) {
    return (
      <section className={`runs-section ${variant === "mission" ? "runs-section--mission" : ""}`}>
        <h2 className="runs-section__title">{title}</h2>
        <SectionCardShell>
          <EmptyState
            title={emptyTitle ?? "Rien pour l’instant"}
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

export default async function RunsPage() {
  const runs = await fetchManagedRunsForList();

  const scheduled = runs.filter((r) => r.status === "SCHEDULED");
  const starting = runs.filter((r) => r.status === "STARTING");
  const active = runs.filter((r) => r.status === "ACTIVE");
  const inFlight = [...starting, ...active];
  const done = runs.filter((r) =>
    ["COMPLETED", "FAILED", "CANCELLED"].includes(r.status),
  );

  return (
    <div className="dashboard-main runs-dashboard">
      <PageHeader
        title="Centre de mission"
        description="Suivez les batailles planifiées, pilotez celles en direct, consultez l’historique."
        actions={
          <Link href="/dashboard/events" className="btn btn-primary">
            Nouvel événement
          </Link>
        }
      />

      <RunSection
        title={`Planifiés (${scheduled.length})`}
        runs={scheduled}
        showCancel
        emptyTitle="Aucun événement planifié"
        emptyDescription="Choisissez une date et un modèle depuis la page Événements."
        emptyHref="/dashboard/events?mode=schedule"
        emptyActionLabel="Planifier"
      />
      <RunSection
        title={`En cours (${inFlight.length})`}
        runs={inFlight}
        showCancel={false}
        variant="mission"
        emptyTitle="Aucune bataille en direct"
        emptyDescription="Lancez un événement pour afficher la barre de progression et les commandes."
        emptyHref="/dashboard/events"
        emptyActionLabel="Lancer une bataille"
      />
      <RunSection
        title={`Historique (${done.length})`}
        runs={done}
        showCancel={false}
        history
        emptyTitle="Pas encore d’historique"
        emptyDescription="Les batailles terminées ou annulées s’affichent ici."
      />
    </div>
  );
}
