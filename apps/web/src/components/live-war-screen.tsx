"use client";

import { useEffect, useMemo, useState } from "react";
import type { LiveBattlePayload } from "@/lib/live-battle-view";

function formatRemaining(ms: number): string {
  if (ms <= 0) return "0:00";
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  const sec = s % 60;
  const min = m % 60;
  if (h > 0) return `${h}h ${min}m ${sec}s`;
  if (m > 0) return `${m}m ${sec.toString().padStart(2, "0")}s`;
  return `${sec}s`;
}

function sideFr(side: "west" | "east"): string {
  return side === "west" ? "Ouest (WEST)" : "Est (EAST)";
}

export function LiveWarScreen({ initial }: { initial: LiveBattlePayload }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);

  const countdownLabel = useMemo(() => {
    if (!initial.countdownTargetIso) return null;
    const target = new Date(initial.countdownTargetIso).getTime();
    return formatRemaining(target - now);
  }, [initial.countdownTargetIso, now]);

  const live =
    initial.status === "ACTIVE" ||
    initial.status === "STARTING" ||
    initial.status === "SCHEDULED";

  return (
    <div className="live-war">
      <header className="live-war__top">
        <p className="live-war__eyebrow">{initial.eventDisplayName}</p>
        <h1 className="live-war__title">{initial.missionTitle}</h1>
        <p className="live-war__status" data-status={initial.status}>
          {initial.status === "SCHEDULED"
            ? "Planifiée"
            : initial.status === "STARTING"
              ? "Démarrage"
              : initial.status === "ACTIVE"
                ? "En direct"
                : initial.status === "COMPLETED"
                  ? "Terminée"
                  : initial.status === "CANCELLED"
                    ? "Annulée"
                    : "Clôturée"}
        </p>
      </header>

      {countdownLabel && live ? (
        <section className="live-war__countdown" aria-live="polite">
          <span className="live-war__countdown-label">
            {initial.status === "SCHEDULED"
              ? "Départ dans"
              : "Prochaine annonce dans"}
          </span>
          <span className="live-war__countdown-value">{countdownLabel}</span>
        </section>
      ) : null}

      <section className="live-war__block live-war__block--objective">
        <h2 className="live-war__label">Objectif actuel</h2>
        <p className="live-war__body">{initial.currentObjective}</p>
      </section>

      <div className="live-war__grid">
        <section className="live-war__block">
          <h2 className="live-war__label">Bâtiment assigné</h2>
          <p className="live-war__body live-war__body--accent">
            {initial.assignedBuilding ?? "—"}
          </p>
        </section>
        <section className="live-war__block">
          <h2 className="live-war__label">Côté</h2>
          <p className="live-war__body live-war__body--accent">
            {initial.assignedSide ? sideFr(initial.assignedSide) : "—"}
          </p>
        </section>
        <section className="live-war__block">
          <h2 className="live-war__label">Légion</h2>
          <p className="live-war__body live-war__body--accent">
            {initial.legionLabel ?? "—"}
          </p>
        </section>
        <section className="live-war__block">
          <h2 className="live-war__label">Leader</h2>
          <p className="live-war__body live-war__body--accent">
            {initial.leaderName ?? "—"}
          </p>
        </section>
      </div>

      {initial.personalSlotLabel ? (
        <p className="live-war__slot muted">Poste · {initial.personalSlotLabel}</p>
      ) : null}

      <section className="live-war__block live-war__block--next">
        <h2 className="live-war__label">Prochaine action</h2>
        <p className="live-war__body">{initial.nextAction}</p>
      </section>
    </div>
  );
}
