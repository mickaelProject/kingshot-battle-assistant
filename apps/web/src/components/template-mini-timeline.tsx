import type { BattlePhaseType } from "@prisma/client";
import { formatTimelineTLabel } from "@/lib/time-human";

type Ev = {
  offsetSeconds: number;
  phaseType: BattlePhaseType;
  title: string;
};

export function TemplateMiniTimeline({ events }: { events: Ev[] }) {
  if (events.length === 0) {
    return <p className="template-mini-tl__empty muted">Aucune phase</p>;
  }

  const sorted = [...events].sort((a, b) => a.offsetSeconds - b.offsetSeconds);

  return (
    <div className="template-mini-tl" aria-hidden>
      <div className="template-mini-tl__track">
        {sorted.map((ev, i) => (
          <div
            key={`${ev.offsetSeconds}-${i}`}
            className={`template-mini-tl__seg template-mini-tl__seg--${ev.phaseType.toLowerCase()}`}
            title={`${formatTimelineTLabel(ev.offsetSeconds)} · ${ev.title}`}
          />
        ))}
      </div>
      <ul className="template-mini-tl__labels">
        {sorted.slice(0, 4).map((ev, i) => (
          <li key={`${ev.offsetSeconds}-lbl-${i}`}>
            <span className="template-mini-tl__t">
              {formatTimelineTLabel(ev.offsetSeconds)}
            </span>
            <span className="template-mini-tl__title">{ev.title || "—"}</span>
          </li>
        ))}
        {sorted.length > 4 ? (
          <li className="template-mini-tl__more muted">
            +{sorted.length - 4} autres
          </li>
        ) : null}
      </ul>
    </div>
  );
}
