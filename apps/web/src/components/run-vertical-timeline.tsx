import type { BattlePhaseType, ManagedEventStatus, ReminderStatus } from "@prisma/client";
import { formatTimelineTLabel } from "@/lib/time-human";

export type RunVerticalReminder = {
  id: string;
  status: ReminderStatus;
  title: string;
  phaseType: BattlePhaseType;
  scheduledAt: Date;
  objective: string;
  action: string;
};

function phaseBadgeLabel(phaseType: BattlePhaseType): string {
  switch (phaseType) {
    case "START":
      return "START";
    case "OBJECTIVE":
      return "OBJECTIVE";
    case "REMINDER":
      return "REMINDER";
    case "FINAL":
      return "FINAL";
    default:
      return String(phaseType);
  }
}

function statusLabel(s: ReminderStatus): string {
  switch (s) {
    case "PENDING":
      return "En attente";
    case "PROCESSING":
      return "En cours";
    case "SENT":
      return "Envoyé";
    case "SKIPPED":
      return "Ignoré";
    default:
      return s;
  }
}

function describeReminder(r: RunVerticalReminder): string {
  const o = r.objective?.trim();
  const a = r.action?.trim();
  if (o && a) return `${o} — ${a}`;
  if (o) return o;
  if (a) return a;
  return "Pas de consignes détaillées pour cette phase.";
}

export function RunVerticalTimeline({
  runStatus,
  startedAt,
  reminders,
}: {
  runStatus: ManagedEventStatus;
  startedAt: Date | null;
  reminders: RunVerticalReminder[];
}) {
  const activeId = (() => {
    if (!["ACTIVE", "STARTING"].includes(runStatus)) return null;
    const proc = reminders.find((x) => x.status === "PROCESSING");
    if (proc) return proc.id;
    const pend = reminders.find((x) => x.status === "PENDING");
    return pend?.id ?? null;
  })();

  return (
    <ol className="run-vt">
      {reminders.map((rem, idx) => {
        const isLast = idx === reminders.length - 1;
        const offsetSec = startedAt
          ? Math.max(
              0,
              Math.round(
                (rem.scheduledAt.getTime() - startedAt.getTime()) / 1000,
              ),
            )
          : null;
        const tLabel =
          offsetSec !== null
            ? formatTimelineTLabel(offsetSec)
            : new Date(rem.scheduledAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              });

        const isDone = rem.status === "SENT" || rem.status === "SKIPPED";
        const isActive = rem.id === activeId;
        const stateClass = isActive
          ? "run-vt__node--active"
          : isDone
            ? "run-vt__node--done"
            : "run-vt__node--pending";

        return (
          <li key={rem.id} className={`run-vt__item ${stateClass}`}>
            <div className="run-vt__rail" aria-hidden>
              <span className="run-vt__dot" />
              {!isLast ? <span className="run-vt__stem" /> : null}
            </div>
            <article className="run-vt__card">
              <header className="run-vt__card-head">
                <span
                  className={`run-vt__phase-badge run-vt__phase-badge--${rem.phaseType.toLowerCase()}`}
                >
                  {phaseBadgeLabel(rem.phaseType)}
                </span>
                <span className="run-vt__tlabel">{tLabel}</span>
                <span
                  className={`run-vt__status run-vt__status--${rem.status.toLowerCase()}`}
                >
                  {statusLabel(rem.status)}
                </span>
              </header>
              <h3 className="run-vt__title">{rem.title?.trim() || "—"}</h3>
              <p className="run-vt__desc muted">{describeReminder(rem)}</p>
            </article>
          </li>
        );
      })}
    </ol>
  );
}
