"use client";

import { useEffect, useState } from "react";
import { formatElapsedClock } from "@/lib/time-human";

export function RunMissionStrip({
  status,
  startedAtIso,
  scheduledAtIso,
  eventDurationMinutes,
  nextTitle,
  nextAtIso,
  phasesDone,
  phasesTotal,
}: {
  status: string;
  startedAtIso: string | null;
  scheduledAtIso: string;
  eventDurationMinutes: number;
  nextTitle: string | null;
  nextAtIso: string | null;
  phasesDone: number;
  phasesTotal: number;
}) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (status !== "ACTIVE" && status !== "STARTING") return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [status]);

  const anchorMs = startedAtIso
    ? new Date(startedAtIso).getTime()
    : new Date(scheduledAtIso).getTime();
  const elapsedSec = Math.floor((now - anchorMs) / 1000);
  const eventTotalSec = Math.max(1, eventDurationMinutes * 60);
  const progress = Math.min(100, (elapsedSec / eventTotalSec) * 100);
  const remainingSec = Math.max(0, eventTotalSec - elapsedSec);

  if (!["ACTIVE", "STARTING"].includes(status)) {
    return null;
  }

  return (
    <div className="run-mission-strip" aria-label="Mission en cours">
      <div className="run-mission-strip__metrics">
        <div className="run-mission-strip__metric">
          <span className="run-mission-strip__label">Temps écoulé</span>
          <strong className="run-mission-strip__value">
            {formatElapsedClock(elapsedSec)}
          </strong>
        </div>
        <div className="run-mission-strip__metric">
          <span className="run-mission-strip__label">Temps restant</span>
          <strong className="run-mission-strip__value">
            {formatElapsedClock(remainingSec)}
          </strong>
        </div>
        <div className="run-mission-strip__metric">
          <span className="run-mission-strip__label">Durée événement</span>
          <strong className="run-mission-strip__value">
            {eventDurationMinutes} min
          </strong>
        </div>
        <div className="run-mission-strip__metric">
          <span className="run-mission-strip__label">Phases annonces</span>
          <strong className="run-mission-strip__value">
            {phasesTotal > 0 ? `${phasesDone} / ${phasesTotal}` : "—"}
          </strong>
        </div>
      </div>
      <div
        className="run-mission-strip__bar"
        role="progressbar"
        aria-valuenow={Math.round(progress)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Progression sur la durée événement in-game"
      >
        <span
          className="run-mission-strip__bar-fill"
          style={{ width: `${progress}%` }}
        />
      </div>
      {nextTitle ? (
        <p className="run-mission-strip__next">
          <span className="muted">Prochaine annonce · </span>
          <strong>{nextTitle}</strong>
          {nextAtIso ? (
            <span className="muted">
              {" "}
              ·{" "}
              {new Date(nextAtIso).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          ) : null}
        </p>
      ) : phasesTotal > 0 && phasesDone >= phasesTotal ? (
        <p className="run-mission-strip__next muted">
          Dernières annonces envoyées — l’événement peut encore être en cours in-game.
        </p>
      ) : null}
    </div>
  );
}
