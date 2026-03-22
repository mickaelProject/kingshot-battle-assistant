type Phase = {
  id: string;
  offsetSeconds: number;
  phaseType: string;
  key: string;
  title: string;
};

export function PhaseTimeline({ phases }: { phases: Phase[] }) {
  if (phases.length === 0) return null;

  return (
    <div className="phase-timeline" aria-label="Timeline des phases">
      <div className="phase-timeline__scroll">
        {phases.map((p, i) => (
          <div key={p.id} className="phase-timeline__segment">
            <div className="phase-timeline__card">
              <span className="phase-timeline__t">T+{p.offsetSeconds}s</span>
              <span className="badge badge-phase">{p.phaseType}</span>
              <code className="phase-timeline__key">{p.key}</code>
              <div className="phase-timeline__title">{p.title}</div>
            </div>
            {i < phases.length - 1 ? (
              <span className="phase-timeline__arrow" aria-hidden>
                →
              </span>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
