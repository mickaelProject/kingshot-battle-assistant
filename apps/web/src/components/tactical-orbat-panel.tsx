"use client";

import {
  BATTLE_ARCHETYPE_OPTIONS,
  type TacticalWarPlan,
} from "@/lib/tactical-war-plan";
import { fmtPowerShort } from "@/lib/roster-generation.service";

function namesJoin(list: { name: string }[], max = 14): string {
  if (!list.length) return "—";
  const s = list.slice(0, max).map((p) => p.name);
  if (list.length > max) s.push(`+${list.length - max}`);
  return s.join(", ");
}

export function TacticalOrbatPanel({ plan }: { plan: TacticalWarPlan }) {
  const archeLabel =
    BATTLE_ARCHETYPE_OPTIONS.find((o) => o.value === plan.archetype)?.label ??
    plan.archetype;

  return (
    <div className="tactical-orbat">
      <div className="tactical-orbat__command-strip">
        <span className="tactical-orbat__command-label">Arc tactique</span>
        <strong className="tactical-orbat__command-value">{archeLabel}</strong>
        {plan.archetype !== "SWORDLAND" ? (
          <span className="tactical-orbat__command-soon muted">
            ORBAT bâtiments : réservé Swordland — ci-dessous : légions &
            buckets 10/40/50.
          </span>
        ) : null}
      </div>

      {plan.legions.map((L) => (
        <section key={L.index} className="tactical-orbat__legion">
          <header className="tactical-orbat__legion-head">
            <h3 className="tactical-orbat__legion-title">
              <span className="tactical-orbat__legion-emoji" aria-hidden>
                {L.emoji}
              </span>
              {L.label}
              <span className="tactical-orbat__legion-meta muted">
                {L.playerCount} joueurs · Σ {fmtPowerShort(L.totalPower)}
              </span>
            </h3>
          </header>

          <div className="tactical-orbat__sides">
            <div className="tactical-orbat__side tactical-orbat__side--west">
              <h4 className="tactical-orbat__side-title">
                Ouest <span className="tactical-orbat__side-axis">WEST</span>
              </h4>
              <ul className="tactical-orbat__bucket-list">
                <li>
                  <span className="tactical-orbat__bucket-label">Leaders</span>
                  <span className="tactical-orbat__bucket-body">
                    {namesJoin(L.west.leaders, 8)}
                  </span>
                </li>
                <li>
                  <span className="tactical-orbat__bucket-label">
                    Noyau défense
                  </span>
                  <span className="tactical-orbat__bucket-body">
                    {namesJoin(L.west.defenders, 12)}
                  </span>
                </li>
                <li>
                  <span className="tactical-orbat__bucket-label">Mobile</span>
                  <span className="tactical-orbat__bucket-body">
                    {namesJoin(L.west.mobile, 12)}
                  </span>
                </li>
              </ul>
            </div>
            <div className="tactical-orbat__side tactical-orbat__side--east">
              <h4 className="tactical-orbat__side-title">
                <span className="tactical-orbat__side-axis">EAST</span> Est
              </h4>
              <ul className="tactical-orbat__bucket-list">
                <li>
                  <span className="tactical-orbat__bucket-label">Leaders</span>
                  <span className="tactical-orbat__bucket-body">
                    {namesJoin(L.east.leaders, 8)}
                  </span>
                </li>
                <li>
                  <span className="tactical-orbat__bucket-label">
                    Noyau défense
                  </span>
                  <span className="tactical-orbat__bucket-body">
                    {namesJoin(L.east.defenders, 12)}
                  </span>
                </li>
                <li>
                  <span className="tactical-orbat__bucket-label">Mobile</span>
                  <span className="tactical-orbat__bucket-body">
                    {namesJoin(L.east.mobile, 12)}
                  </span>
                </li>
              </ul>
            </div>
          </div>

          {L.buildings.length > 0 ? (
            <div className="tactical-orbat__buildings">
              <h4 className="tactical-orbat__buildings-title">
                Objectifs & assignations
              </h4>
              <p className="tactical-orbat__buildings-lede muted">
                Bell Tower, Sanctums, Abbeys, Royal Stables, Hall of Reformation,
                Mercenary Camp, Swordshrines — RL et groupe par bâtiment.
              </p>
              <ul className="tactical-orbat__building-grid" role="list">
                {L.buildings.map((b) => (
                  <li key={b.id} className="tactical-orbat__building-card">
                    <div className="tactical-orbat__building-name">{b.name}</div>
                    <div className="tactical-orbat__building-side muted">
                      {b.side}
                    </div>
                    <div className="tactical-orbat__building-leader">
                      <span className="muted">RL</span>{" "}
                      <strong>{b.leader?.name ?? "—"}</strong>
                    </div>
                    <div className="tactical-orbat__building-players muted">
                      {b.players.length
                        ? b.players.map((p) => p.name).join(", ")
                        : "—"}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      ))}

      <p className="tactical-orbat__foot muted">
        Règle auto : <strong>10 %</strong> leaders, <strong>40 %</strong> noyau
        défense, <strong>50 %</strong> mobile — par côté ouest / est, par légion.
        Deux champs roster (L1 / L2) alimentent les légions sans séparateur
        manuel.
      </p>
    </div>
  );
}
