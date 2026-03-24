"use client";

import { useMemo, useState } from "react";
import { RosterDraftTimeline } from "@/components/roster-draft-timeline";
import { fmtPowerShort } from "@/lib/roster-generation.service";
import type { GeneratedRosterPhase } from "@/lib/roster-template/types";
import type { PhaseTacticalOverlay } from "@/lib/tactical-war-plan";
import type { GeneratedRosterResult } from "@/lib/roster/generateRoster";

const ROLE_LABELS = {
  rally_leader: "Rally leaders",
  garrison: "Garnisons",
  support: "Support",
} as const;

function PlayerLine({ name, power }: { name: string; power: number }) {
  return (
    <li className="event-roster-review__player">
      <span>{name}</span>
      <span className="muted">{fmtPowerShort(power)}</span>
    </li>
  );
}

export function EventRosterReview({
  result,
  globalPhases,
  eventDurationMinutes,
  phaseOverlays,
  selectedKey,
  onSelectPhase,
}: {
  result: GeneratedRosterResult;
  globalPhases?: GeneratedRosterPhase[];
  eventDurationMinutes?: number;
  phaseOverlays?: PhaseTacticalOverlay[];
  selectedKey?: string | null;
  onSelectPhase?: (key: string) => void;
}) {
  const [tab, setTab] = useState<"plan" | "timeline">("plan");
  const showTimeline =
    (globalPhases?.length ?? 0) > 0 &&
    eventDurationMinutes != null &&
    onSelectPhase != null;

  const body = useMemo(() => {
    switch (result.eventType) {
      case "kvk_preparation":
        return (
          <div className="event-roster-review__sections">
            {result.tasks.map((t) => (
              <section key={t.id} className="event-roster-review__card">
                <h4 className="event-roster-review__card-title">{t.title}</h4>
                <p className="event-roster-review__card-desc muted">{t.description}</p>
                <ul className="event-roster-review__player-list">
                  {t.players.length === 0 ? (
                    <li className="muted">Aucun joueur</li>
                  ) : (
                    t.players.map((p) => (
                      <PlayerLine key={p.name} name={p.name} power={p.power} />
                    ))
                  )}
                </ul>
              </section>
            ))}
          </div>
        );
      case "kvk_war":
        return (
          <div className="event-roster-review__sections">
            {(Object.keys(result.roles) as (keyof typeof result.roles)[]).map(
              (role) => (
                <section key={role} className="event-roster-review__card">
                  <h4 className="event-roster-review__card-title">
                    {ROLE_LABELS[role]}
                  </h4>
                  <ul className="event-roster-review__player-list">
                    {result.roles[role].length === 0 ? (
                      <li className="muted">—</li>
                    ) : (
                      result.roles[role].map((p) => (
                        <PlayerLine key={p.name} name={p.name} power={p.power} />
                      ))
                    )}
                  </ul>
                </section>
              ),
            )}
          </div>
        );
      case "sanctuary_battle":
        return (
          <div className="event-roster-review__sections">
            {result.slots.map((s) => (
              <section key={s.id} className="event-roster-review__card">
                <h4 className="event-roster-review__card-title">{s.label}</h4>
                <div className="event-roster-review__two-col">
                  <div>
                    <p className="event-roster-review__sub muted">Attaque</p>
                    <ul className="event-roster-review__player-list">
                      {s.attack.map((p) => (
                        <PlayerLine key={p.name} name={p.name} power={p.power} />
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="event-roster-review__sub muted">Défense</p>
                    <ul className="event-roster-review__player-list">
                      {s.defense.map((p) => (
                        <PlayerLine key={p.name} name={p.name} power={p.power} />
                      ))}
                    </ul>
                  </div>
                </div>
              </section>
            ))}
          </div>
        );
      case "alliance_mobilization":
        return (
          <div className="event-roster-review__sections">
            {result.missions.map((m) => (
              <section key={m.id} className="event-roster-review__card">
                <h4 className="event-roster-review__card-title">
                  {m.title}{" "}
                  <span className="event-roster-review__quota muted">
                    (quota {m.quota})
                  </span>
                </h4>
                <ul className="event-roster-review__player-list">
                  {m.players.map((p) => (
                    <PlayerLine key={p.name} name={p.name} power={p.power} />
                  ))}
                </ul>
              </section>
            ))}
          </div>
        );
      case "flamedragon_tyrant":
        return (
          <div className="event-roster-review__sections">
            <section className="event-roster-review__card">
              <h4 className="event-roster-review__card-title">Ordre de rotation</h4>
              <p className="muted">{result.rotationOrder.join(" → ")}</p>
            </section>
            {result.groups.map((g) => (
              <section key={g.id} className="event-roster-review__card">
                <h4 className="event-roster-review__card-title">{g.label}</h4>
                <ul className="event-roster-review__player-list">
                  {g.players.map((p) => (
                    <PlayerLine key={p.name} name={p.name} power={p.power} />
                  ))}
                </ul>
              </section>
            ))}
          </div>
        );
      case "kingdom_transfer":
        return (
          <div className="event-roster-review__sections">
            {result.groups.map((g) => (
              <section key={g.id} className="event-roster-review__card">
                <h4 className="event-roster-review__card-title">{g.label}</h4>
                <ul className="event-roster-review__player-list">
                  {g.players.map((p) => (
                    <PlayerLine key={p.name} name={p.name} power={p.power} />
                  ))}
                </ul>
              </section>
            ))}
          </div>
        );
      case "swordland":
        return (
          <p className="muted">
            Affichage Swordland : workspace tactique (légions / carte).
          </p>
        );
      default:
        return null;
    }
  }, [result]);

  return (
    <div className="event-roster-review">
      {showTimeline ? (
        <div className="event-roster-review__tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={tab === "plan"}
            className={`event-roster-review__tab${tab === "plan" ? " event-roster-review__tab--active" : ""}`}
            onClick={() => setTab("plan")}
          >
            Plan roster
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "timeline"}
            className={`event-roster-review__tab${tab === "timeline" ? " event-roster-review__tab--active" : ""}`}
            onClick={() => setTab("timeline")}
          >
            Timeline
          </button>
        </div>
      ) : null}

      {tab === "plan" || !showTimeline ? (
        <div className="event-roster-review__panel">{body}</div>
      ) : null}

      {tab === "timeline" && showTimeline ? (
        <div className="event-roster-review__panel event-roster-review__panel--timeline">
          <RosterDraftTimeline
            phases={globalPhases!}
            eventDurationMinutes={eventDurationMinutes!}
            selectedKey={selectedKey ?? null}
            onSelectPhase={onSelectPhase!}
            phaseOverlays={phaseOverlays}
          />
        </div>
      ) : null}
    </div>
  );
}
