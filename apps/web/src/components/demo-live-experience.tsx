"use client";

import { useEffect, useMemo, useState } from "react";
import { BattlefieldMap, type BuildingKey } from "@/components/battlefield-map";

const TIMELINE = [
  { minute: 0, title: "Briefing commandement", objective: "Synchroniser les calls" },
  { minute: 8, title: "Capture Bell Tower", objective: "Prendre le controle central" },
  { minute: 16, title: "Push Sanctum 1", objective: "Legion 1 maintient la pression" },
  { minute: 26, title: "Rotate Sanctum 2", objective: "Legion 2 prend le relai" },
  { minute: 38, title: "Defendre Abbey", objective: "Conserver les objectifs cle" },
  { minute: 50, title: "All-in final", objective: "Maximiser les points finaux" },
  { minute: 60, title: "Debrief", objective: "Cloturer et preparer prochain event" },
] as const;

const PHASE_BUILDINGS: BuildingKey[][] = [
  ["bell_tower", "swordshrines"],
  ["bell_tower", "sanctum_1"],
  ["sanctum_1", "abbey_2"],
  ["sanctum_2", "abbey_3"],
  ["abbey_1", "abbey_4", "hall_of_reformation"],
  ["royal_stables", "mercenary_camp", "bell_tower"],
  ["swordshrines"],
];

const ROSTER = [
  { name: "Astra", role: "Shotcaller", legion: 1 },
  { name: "Kyren", role: "Bell Tower Lead", legion: 1 },
  { name: "Mira", role: "Support Push", legion: 1 },
  { name: "Nox", role: "Sanctum Lead", legion: 2 },
  { name: "Iris", role: "Defensive Anchor", legion: 2 },
  { name: "Rook", role: "Flank Pressure", legion: 2 },
];

function formatMinute(v: number) {
  return `${String(Math.floor(v)).padStart(2, "0")}:00`;
}

export function DemoLiveExperience() {
  const [tick, setTick] = useState(9);

  useEffect(() => {
    const id = window.setInterval(() => {
      setTick((prev) => (prev >= 60 ? 0 : prev + 1));
    }, 1400);
    return () => window.clearInterval(id);
  }, []);

  const currentIdx = useMemo(() => {
    let idx = 0;
    for (let i = 0; i < TIMELINE.length; i += 1) {
      if (tick >= TIMELINE[i]!.minute) idx = i;
    }
    return idx;
  }, [tick]);

  const current = TIMELINE[currentIdx]!;
  const next = TIMELINE[Math.min(currentIdx + 1, TIMELINE.length - 1)]!;

  return (
    <section className="demo-live">
      <header className="demo-live__header">
        <h1>Live demo - Swordland battle</h1>
        <p className="muted">Simulation interactive prete a tester sans configuration.</p>
      </header>

      <div className="demo-live__layout">
        <aside className="demo-panel">
          <p className="demo-panel__title">Roster + Legions</p>
          <div className="demo-roster">
            {ROSTER.map((player) => (
              <div key={player.name} className="demo-roster__row">
                <strong>{player.name}</strong>
                <span>{player.role}</span>
                <span className="public-badge public-badge--ok">Legion {player.legion}</span>
              </div>
            ))}
          </div>
        </aside>

        <main className="demo-timeline">
          <div className="demo-timeline__clock">T+ {formatMinute(tick)}</div>
          {TIMELINE.map((step, idx) => (
            <article
              key={step.title}
              className={`demo-timeline__item${idx === currentIdx ? " demo-timeline__item--active" : ""}`}
            >
              <div className="demo-timeline__minute">{formatMinute(step.minute)}</div>
              <div>
                <p className="demo-timeline__item-title">{step.title}</p>
                <p className="muted">{step.objective}</p>
              </div>
            </article>
          ))}
          <BattlefieldMap
            activeBuildings={PHASE_BUILDINGS[currentIdx] ?? []}
            players={ROSTER.map((p) => ({ name: p.name, legion: p.legion as 1 | 2 }))}
            phaseLabel={current.title}
          />
        </main>

        <aside className="demo-panel demo-panel--discord">
          <p className="demo-panel__title">Discord preview</p>
          <div className="demo-discord">
            <p className="demo-discord__channel">#swordland-command</p>
            <div className="demo-discord__msg">
              <strong>{current.title}</strong>
              <p>{current.objective}</p>
            </div>
            <div className="demo-discord__msg demo-discord__msg--next">
              <strong>Prochaine phase</strong>
              <p>{next.title}</p>
            </div>
            <p className="demo-discord__live">Live actif - diffusion auto</p>
          </div>
        </aside>
      </div>
    </section>
  );
}
