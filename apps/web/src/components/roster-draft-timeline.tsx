"use client";

import type { CSSProperties } from "react";
import { useMemo } from "react";
import type { PhaseTacticalOverlay } from "@/lib/tactical-war-plan";
import type { GeneratedRosterPhase } from "@/lib/roster-template/types";
import { TACTICAL_PHASE_UI } from "@/lib/tactical-preview";
import { formatDurationHuman, formatTimelineTLabel } from "@/lib/time-human";

const PHASE_LABELS: Record<string, string> = {
  START: "START",
  OBJECTIVE: "OBJECTIVE",
  REMINDER: "REMINDER",
  FINAL: "FINAL",
};

function phasePriority(
  phaseType: string,
): { label: string; tier: "low" | "mid" | "high" } {
  switch (phaseType) {
    case "START":
      return { label: "LOW", tier: "low" };
    case "REMINDER":
      return { label: "MEDIUM", tier: "mid" };
    case "OBJECTIVE":
      return { label: "HIGH", tier: "high" };
    case "FINAL":
      return { label: "HIGH", tier: "high" };
    default:
      return { label: "MEDIUM", tier: "mid" };
  }
}

export function RosterDraftTimeline({
  phases,
  eventDurationMinutes,
  selectedKey,
  onSelectPhase,
  phaseOverlays,
}: {
  phases: GeneratedRosterPhase[];
  eventDurationMinutes: number;
  selectedKey: string | null;
  onSelectPhase: (key: string) => void;
  phaseOverlays?: PhaseTacticalOverlay[];
}) {
  const sorted = useMemo(
    () => [...phases].sort((a, b) => a.orderIndex - b.orderIndex),
    [phases],
  );
  const overlayByOrder = useMemo(() => {
    const m = new Map<number, PhaseTacticalOverlay>();
    for (const o of phaseOverlays ?? []) m.set(o.orderIndex, o);
    return m;
  }, [phaseOverlays]);
  const durationSec = eventDurationMinutes * 60;

  if (sorted.length === 0) {
    return (
      <p className="tactical-war-timeline__empty muted">Aucune phase générée.</p>
    );
  }

  return (
    <div className="tactical-war-timeline">
      <ul className="tactical-war-timeline__list" role="list">
        {sorted.map((p, index) => {
          const ui = TACTICAL_PHASE_UI[p.phaseType] ?? TACTICAL_PHASE_UI.REMINDER;
          const isActive = selectedKey === p.key;
          const isLast = index === sorted.length - 1;
          const hitsEnd = p.offsetSeconds === durationSec;
          const pr = phasePriority(p.phaseType);
          const toneClass = `tactical-war-card--${p.phaseType.toLowerCase()}`;
          const ov = overlayByOrder.get(p.orderIndex);

          return (
            <li key={p.key} className="tactical-war-timeline__row">
              <div
                className="tactical-war-timeline__rail"
                aria-hidden
                style={{ "--phase-accent": ui.color } as CSSProperties}
              >
                <span className="tactical-war-timeline__glow-line" />
                <span className="tactical-war-timeline__dot" />
                {!isLast ? (
                  <span className="tactical-war-timeline__stem" />
                ) : null}
              </div>

              <article
                className={`tactical-war-card ${toneClass} ${isActive ? "tactical-war-card--active" : ""} ${isLast && hitsEnd ? "tactical-war-card--finalevent" : ""}`}
                style={{ "--phase-accent": ui.color } as CSSProperties}
              >
                <button
                  type="button"
                  className="tactical-war-card__hit"
                  onClick={() => onSelectPhase(p.key)}
                  aria-pressed={isActive}
                  aria-label={`Phase ${formatTimelineTLabel(p.offsetSeconds)} — ${p.title}`}
                >
                  <header className="tactical-war-card__head">
                    <div className="tactical-war-card__time-block">
                      <span
                        className="tactical-war-card__time"
                        style={{ color: ui.color }}
                      >
                        {formatTimelineTLabel(p.offsetSeconds)}
                      </span>
                    </div>
                    <div className="tactical-war-card__badges">
                      <span
                        className="tactical-war-card__phase-pill"
                        style={{
                          background: `color-mix(in srgb, ${ui.color} 22%, transparent)`,
                          color: ui.color,
                          borderColor: `color-mix(in srgb, ${ui.color} 45%, transparent)`,
                        }}
                      >
                        <span aria-hidden>{ui.ribbon}</span>
                        {PHASE_LABELS[p.phaseType] ?? p.phaseType}
                      </span>
                      <span
                        className={`tactical-war-card__priority tactical-war-card__priority--${pr.tier}`}
                      >
                        {pr.label}
                      </span>
                    </div>
                    {isLast && hitsEnd ? (
                      <span className="tactical-war-card__fin-badge">
                        Fin événement
                      </span>
                    ) : null}
                  </header>

                  <h3 className="tactical-war-card__title">{p.title}</h3>

                  {ov ? (
                    <div className="tactical-war-card__orbat">
                      <div className="tactical-war-card__orbat-focus">
                        <span className="tactical-war-card__orbat-focus-icon" aria-hidden>
                          🎯
                        </span>
                        <span>{ov.headline}</span>
                      </div>
                      {ov.leadersInvolved.length > 0 ? (
                        <p className="tactical-war-card__orbat-leaders">
                          <span className="muted">Leaders</span>{" "}
                          <strong>{ov.leadersInvolved.join(" · ")}</strong>
                        </p>
                      ) : null}
                      <div className="tactical-war-card__orbat-grid">
                        <div className="tactical-war-card__orbat-column">
                          <div className="tactical-war-card__orbat-side-h">
                            WEST
                          </div>
                          <ul className="tactical-war-card__orbat-list">
                            {ov.westRows.map((r, j) => (
                              <li key={`w-${j}`}>
                                <span className="tactical-war-card__orbat-b">
                                  {r.building}
                                </span>
                                <span className="tactical-war-card__orbat-a">
                                  → <strong>{r.leader}</strong>
                                </span>
                                <span className="muted tactical-war-card__orbat-p">
                                  {r.players}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div className="tactical-war-card__orbat-column">
                          <div className="tactical-war-card__orbat-side-h tactical-war-card__orbat-side-h--east">
                            EAST
                          </div>
                          <ul className="tactical-war-card__orbat-list">
                            {ov.eastRows.map((r, j) => (
                              <li key={`e-${j}`}>
                                <span className="tactical-war-card__orbat-b">
                                  {r.building}
                                </span>
                                <span className="tactical-war-card__orbat-a">
                                  → <strong>{r.leader}</strong>
                                </span>
                                <span className="muted tactical-war-card__orbat-p">
                                  {r.players}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {p.objective?.trim() ? (
                    <div className="tactical-war-card__block tactical-war-card__block--objective">
                      <span className="tactical-war-card__block-label">
                        <span aria-hidden>◎</span> Objectif
                      </span>
                      <p className="tactical-war-card__block-text">
                        {p.objective.trim()}
                      </p>
                    </div>
                  ) : null}

                  {p.action?.trim() ? (
                    <div className="tactical-war-card__block tactical-war-card__block--action">
                      <span className="tactical-war-card__block-label">
                        <span aria-hidden>⚡</span> Action
                      </span>
                      <p className="tactical-war-card__block-text">
                        {p.action.trim()}
                      </p>
                    </div>
                  ) : null}

                  {p.nextHint?.trim() ? (
                    <div className="tactical-war-card__next muted">
                      <span className="tactical-war-card__next-label">
                        ⏭ Prochain
                      </span>
                      {p.nextHint.trim()}
                    </div>
                  ) : null}
                </button>
              </article>
            </li>
          );
        })}
      </ul>
      <p className="tactical-war-timeline__foot muted">
        Couverture annonces :{" "}
        <strong>{formatDurationHuman(durationSec)}</strong>
        <span className="tactical-war-timeline__foot-sep">·</span>
        alignée sur <strong>{eventDurationMinutes} min</strong> d’événement
      </p>
    </div>
  );
}
