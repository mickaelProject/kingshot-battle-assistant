"use client";

import { useMemo, useState } from "react";

export type BuildingKey =
  | "bell_tower"
  | "sanctum_1"
  | "sanctum_2"
  | "abbey_1"
  | "abbey_2"
  | "abbey_3"
  | "abbey_4"
  | "royal_stables"
  | "hall_of_reformation"
  | "mercenary_camp"
  | "swordshrines";

type Player = { name: string; legion: 1 | 2 };
type Assignment = {
  leader: string;
  players: string[];
  type: "ATTAQUE" | "DEFENSE";
  legion: 1 | 2;
};

const BUILDINGS: { key: BuildingKey; label: string }[] = [
  { key: "bell_tower", label: "Bell Tower" },
  { key: "sanctum_1", label: "Sanctum 1" },
  { key: "sanctum_2", label: "Sanctum 2" },
  { key: "abbey_1", label: "Abbey 1" },
  { key: "abbey_2", label: "Abbey 2" },
  { key: "abbey_3", label: "Abbey 3" },
  { key: "abbey_4", label: "Abbey 4" },
  { key: "royal_stables", label: "Royal Stables" },
  { key: "hall_of_reformation", label: "Hall of Reformation" },
  { key: "mercenary_camp", label: "Mercenary Camp" },
  { key: "swordshrines", label: "Swordshrines" },
];

const DEFAULT_ASSIGNMENTS: Record<BuildingKey, Assignment> = {
  bell_tower: { leader: "Astra", players: ["Kyren", "Mira"], type: "ATTAQUE", legion: 1 },
  sanctum_1: { leader: "Kyren", players: ["Astra"], type: "ATTAQUE", legion: 1 },
  sanctum_2: { leader: "Nox", players: ["Iris"], type: "DEFENSE", legion: 2 },
  abbey_1: { leader: "Iris", players: ["Rook"], type: "DEFENSE", legion: 2 },
  abbey_2: { leader: "Mira", players: ["Astra"], type: "ATTAQUE", legion: 1 },
  abbey_3: { leader: "Rook", players: ["Nox"], type: "DEFENSE", legion: 2 },
  abbey_4: { leader: "Astra", players: ["Kyren"], type: "ATTAQUE", legion: 1 },
  royal_stables: { leader: "Nox", players: ["Iris"], type: "ATTAQUE", legion: 2 },
  hall_of_reformation: { leader: "Kyren", players: ["Mira"], type: "DEFENSE", legion: 1 },
  mercenary_camp: { leader: "Rook", players: ["Iris"], type: "ATTAQUE", legion: 2 },
  swordshrines: { leader: "Astra", players: ["Kyren", "Nox"], type: "ATTAQUE", legion: 1 },
};

export function BattlefieldMap({
  activeBuildings,
  players,
  phaseLabel,
}: {
  activeBuildings: BuildingKey[];
  players: Player[];
  phaseLabel: string;
}) {
  const [selected, setSelected] = useState<BuildingKey>("bell_tower");
  const [assignments, setAssignments] =
    useState<Record<BuildingKey, Assignment>>(DEFAULT_ASSIGNMENTS);

  const selectedAssignment = assignments[selected];

  const leaders = useMemo(() => players.map((p) => p.name), [players]);

  function updateSelected(next: Partial<Assignment>) {
    setAssignments((prev) => ({
      ...prev,
      [selected]: { ...prev[selected], ...next },
    }));
  }

  function togglePlayer(name: string) {
    const cur = assignments[selected];
    const has = cur.players.includes(name);
    updateSelected({
      players: has ? cur.players.filter((p) => p !== name) : [...cur.players, name],
    });
  }

  return (
    <div className="battlefield-engine">
      <div className="battlefield-engine__head">
        <h3>Battlefield + Strategy Engine</h3>
        <p className="muted">Phase active: {phaseLabel}</p>
      </div>
      <div className="battlefield-engine__body">
        <div className="battlefield-map">
          {BUILDINGS.map((b) => {
            const a = assignments[b.key];
            const active = activeBuildings.includes(b.key);
            const isSelected = selected === b.key;
            return (
              <button
                key={b.key}
                type="button"
                className={[
                  "battlefield-node",
                  active ? "battlefield-node--active" : "",
                  isSelected ? "battlefield-node--selected" : "",
                  a.legion === 1 ? "battlefield-node--legion1" : "battlefield-node--legion2",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() => setSelected(b.key)}
                title={`${b.label} • ${a.type}`}
              >
                <span className="battlefield-node__name">{b.label}</span>
                <span className="battlefield-node__meta">
                  L{a.legion} • {a.type}
                </span>
              </button>
            );
          })}
        </div>

        <aside className="battlefield-assignment">
          <p className="battlefield-assignment__title">Assignation - {BUILDINGS.find((b) => b.key === selected)?.label}</p>
          <label className="battlefield-assignment__label">
            Leader (RL)
            <select
              className="battlefield-assignment__select"
              value={selectedAssignment.leader}
              onChange={(e) => updateSelected({ leader: e.target.value })}
            >
              {leaders.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>

          <div className="battlefield-assignment__row">
            <button
              type="button"
              className={`public-btn ${selectedAssignment.type === "ATTAQUE" ? "public-btn--primary" : ""}`}
              onClick={() => updateSelected({ type: "ATTAQUE" })}
            >
              Attaque
            </button>
            <button
              type="button"
              className={`public-btn ${selectedAssignment.type === "DEFENSE" ? "public-btn--primary" : ""}`}
              onClick={() => updateSelected({ type: "DEFENSE" })}
            >
              Defense
            </button>
          </div>

          <div className="battlefield-assignment__row">
            <button
              type="button"
              className={`public-btn ${selectedAssignment.legion === 1 ? "public-btn--primary" : ""}`}
              onClick={() => updateSelected({ legion: 1 })}
            >
              Legion 1
            </button>
            <button
              type="button"
              className={`public-btn ${selectedAssignment.legion === 2 ? "public-btn--primary" : ""}`}
              onClick={() => updateSelected({ legion: 2 })}
            >
              Legion 2
            </button>
          </div>

          <div className="battlefield-assignment__players">
            {players.map((p) => {
              const on = selectedAssignment.players.includes(p.name);
              return (
                <button
                  key={p.name}
                  type="button"
                  className={`battlefield-player-chip ${on ? "battlefield-player-chip--on" : ""}`}
                  onClick={() => togglePlayer(p.name)}
                >
                  {p.name} (L{p.legion})
                </button>
              );
            })}
          </div>
        </aside>
      </div>
    </div>
  );
}
