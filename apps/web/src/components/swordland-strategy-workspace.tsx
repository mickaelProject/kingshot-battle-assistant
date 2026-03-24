"use client";

import { useEffect, useMemo, useState } from "react";
import { RosterDraftTimeline } from "@/components/roster-draft-timeline";
import { TacticalPhasePreview } from "@/components/tactical-phase-preview";
import { fmtPowerShort } from "@/lib/roster-generation.service";
import type { GeneratedRosterPhase } from "@/lib/roster-template/types";
import type { AppLocale } from "@/i18n/config";
import type {
  BuildingAssignment,
  LegionTacticalPlan,
  TacticalWarPlan,
} from "@/lib/tactical-war-plan";
import { formatOffsetLabel } from "@/lib/time-human";

export type SwordlandPhaseEditFields = {
  title?: string;
  objective?: string;
  action?: string;
  nextHint?: string;
};

function mergePhaseDisplay(
  p: GeneratedRosterPhase,
  edits: Record<string, SwordlandPhaseEditFields>,
): GeneratedRosterPhase {
  const e = edits[p.key];
  if (!e) return p;
  return {
    ...p,
    ...(e.title !== undefined ? { title: e.title } : {}),
    ...(e.objective !== undefined ? { objective: e.objective } : {}),
    ...(e.action !== undefined ? { action: e.action } : {}),
    ...(e.nextHint !== undefined ? { nextHint: e.nextHint } : {}),
  };
}

const MAP_GRID: Record<
  string,
  { gridRow: number; gridColumn: number }
> = {
  abbey1: { gridRow: 1, gridColumn: 1 },
  sanctum1: { gridRow: 1, gridColumn: 2 },
  abbey3: { gridRow: 1, gridColumn: 4 },
  abbey4: { gridRow: 1, gridColumn: 5 },
  abbey2: { gridRow: 2, gridColumn: 1 },
  sanctum2: { gridRow: 2, gridColumn: 2 },
  bell: { gridRow: 2, gridColumn: 3 },
  stables: { gridRow: 2, gridColumn: 4 },
  hall: { gridRow: 2, gridColumn: 5 },
  merc: { gridRow: 3, gridColumn: 4 },
  sword: { gridRow: 3, gridColumn: 5 },
};

function LegionBuildingCard({ b }: { b: BuildingAssignment }) {
  const stanceClass =
    b.stance === "ATTAQUE"
      ? "swordland-building-card__stance--atk"
      : "swordland-building-card__stance--def";
  return (
    <article className="swordland-building-card">
      <header className="swordland-building-card__head">
        <div>
          <h4 className="swordland-building-card__name">{b.name}</h4>
          <span className="swordland-building-card__side muted">
            {b.side === "WEST" ? "Ouest" : "Est"}
          </span>
        </div>
        <span className={`swordland-building-card__stance ${stanceClass}`}>
          {b.stance === "ATTAQUE" ? "Attaque" : "Défense"}
        </span>
      </header>
      <div className="swordland-building-card__rl">
        <span className="muted">Leader</span>
        <strong>{b.leader?.name ?? "—"}</strong>
        {b.leader ? (
          <span className="muted swordland-building-card__pow">
            {fmtPowerShort(b.leader.power)}
          </span>
        ) : null}
      </div>
      <ul className="swordland-building-card__players" aria-label="Joueurs assignés">
        {b.players.length === 0 ? (
          <li className="muted">Aucun assigné</li>
        ) : (
          b.players.map((pl) => (
            <li key={pl.name}>
              <span className="swordland-building-card__pname">{pl.name}</span>
              <span className="muted">{fmtPowerShort(pl.power)}</span>
            </li>
          ))
        )}
      </ul>
    </article>
  );
}

function LegionBoard({
  legion,
  emptyLabel,
}: {
  legion: LegionTacticalPlan | undefined;
  emptyLabel: string;
}) {
  if (!legion || legion.buildings.length === 0) {
    return (
      <div className="swordland-legion-empty muted">
        <p>{emptyLabel}</p>
      </div>
    );
  }
  return (
    <div className="swordland-legion-board">
      <header className="swordland-legion-board__meta">
        <span className="swordland-legion-board__emoji" aria-hidden>
          {legion.emoji}
        </span>
        <div>
          <p className="swordland-legion-board__title">{legion.label}</p>
          <p className="swordland-legion-board__stats muted">
            {legion.playerCount} joueurs · Σ {fmtPowerShort(legion.totalPower)}
          </p>
        </div>
      </header>
      <p className="swordland-legion-board__lede muted">
        Répartition auto par puissance (leaders, noyau défense, mobile) puis
        remplissage des bâtiments.
      </p>
      <div className="swordland-building-grid" role="list">
        {legion.buildings.map((b) => (
          <div key={b.id} role="listitem">
            <LegionBuildingCard b={b} />
          </div>
        ))}
      </div>
    </div>
  );
}

function SwordlandTacticalMap({
  legions,
}: {
  legions: LegionTacticalPlan[];
}) {
  const [legionIdx, setLegionIdx] = useState(0);
  const L = legions[legionIdx];
  const multi = legions.length > 1;

  if (!L || L.buildings.length === 0) {
    return (
      <p className="muted swordland-map__empty">
        Carte disponible après génération ORBAT Swordland.
      </p>
    );
  }

  return (
    <div className="swordland-map">
      {multi ? (
        <div className="swordland-map__toggle" role="tablist" aria-label="Légion affichée">
          {legions.map((leg, i) => (
            <button
              key={leg.index}
              type="button"
              role="tab"
              aria-selected={i === legionIdx}
              className={`swordland-map__toggle-btn${i === legionIdx ? " swordland-map__toggle-btn--on" : ""}`}
              onClick={() => setLegionIdx(i)}
            >
              <span aria-hidden>{leg.emoji}</span> {leg.label}
            </button>
          ))}
        </div>
      ) : null}
      <div className="swordland-map__arena" aria-label="Carte tactique Swordland">
        <div className="swordland-map__axis swordland-map__axis--w">Ouest</div>
        <div className="swordland-map__axis swordland-map__axis--e">Est</div>
        <div className="swordland-map__grid">
          {L.buildings.map((b) => {
            const pos = MAP_GRID[b.id];
            const style = pos
              ? { gridRow: pos.gridRow, gridColumn: pos.gridColumn }
              : undefined;
            const stance =
              b.stance === "ATTAQUE"
                ? "swordland-map-node--atk"
                : "swordland-map-node--def";
            const leader = b.leader?.name ?? "—";
            const names = b.players.map((p) => p.name).slice(0, 4);
            const more =
              b.players.length > names.length
                ? ` +${b.players.length - names.length}`
                : "";
            return (
              <div
                key={b.id}
                className={`swordland-map-node ${stance}`}
                style={style}
                title={`${b.name} · ${b.stance}`}
              >
                <span className="swordland-map-node__name">{b.name}</span>
                <span className="swordland-map-node__rl">{leader}</span>
                <span className="swordland-map-node__players">
                  {names.length ? `${names.join(", ")}${more}` : "—"}
                </span>
              </div>
            );
          })}
        </div>
      </div>
      <p className="swordland-map__foot muted">
        Placement schématique (Ouest à gauche, Est à droite). Les assignations
        suivent le roster {L.label}.
      </p>
    </div>
  );
}

export function SwordlandStrategyWorkspace({
  tacticalPlan,
  globalPhases,
  eventDurationMinutes,
  locale,
  selectedKey,
  onSelectPhase,
  phaseEdits,
  onPhaseEdit,
  showMapTab = true,
}: {
  tacticalPlan: TacticalWarPlan;
  globalPhases: GeneratedRosterPhase[];
  eventDurationMinutes: number;
  locale: AppLocale;
  selectedKey: string | null;
  onSelectPhase: (key: string) => void;
  phaseEdits: Record<string, SwordlandPhaseEditFields>;
  onPhaseEdit: (key: string, patch: SwordlandPhaseEditFields) => void;
  /** Réservé à Swordland — désactiver si un autre contexte réutilise le workspace. */
  showMapTab?: boolean;
}) {
  const [tab, setTab] = useState<
    "legion1" | "legion2" | "timeline" | "map"
  >("legion1");

  useEffect(() => {
    if (!showMapTab && tab === "map") setTab("legion1");
  }, [showMapTab, tab]);

  const mergedGlobal = useMemo(
    () =>
      [...globalPhases]
        .sort((a, b) => a.orderIndex - b.orderIndex)
        .map((p) => mergePhaseDisplay(p, phaseEdits)),
    [globalPhases, phaseEdits],
  );

  const L1 = tacticalPlan.legions.find((l) => l.index === 1);
  const L2 = tacticalPlan.legions.find((l) => l.index === 2);

  const sortedGlobal = useMemo(
    () => [...globalPhases].sort((a, b) => a.orderIndex - b.orderIndex),
    [globalPhases],
  );

  const selectedOriginal =
    sortedGlobal.find((p) => p.key === selectedKey) ?? sortedGlobal[0] ?? null;

  const overlay =
    selectedOriginal != null
      ? tacticalPlan.phaseOverlays.find(
          (o) => o.orderIndex === selectedOriginal.orderIndex,
        )
      : null;

  const displayForPreview = selectedOriginal
    ? mergePhaseDisplay(selectedOriginal, phaseEdits)
    : null;

  const objectiveForPreview =
    displayForPreview && overlay?.markdownAppendix
      ? `${displayForPreview.objective.trim()}${overlay.markdownAppendix}`
      : displayForPreview?.objective ?? "";

  return (
    <div className="swordland-workspace">
      <div className="swordland-workspace__tabs" role="tablist" aria-label="Vue stratégie">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "legion1"}
          className={`swordland-workspace__tab${tab === "legion1" ? " swordland-workspace__tab--active" : ""}`}
          onClick={() => setTab("legion1")}
        >
          Légion 1
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "legion2"}
          className={`swordland-workspace__tab${tab === "legion2" ? " swordland-workspace__tab--active" : ""}`}
          onClick={() => setTab("legion2")}
        >
          Légion 2
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "timeline"}
          className={`swordland-workspace__tab${tab === "timeline" ? " swordland-workspace__tab--active" : ""}`}
          onClick={() => setTab("timeline")}
        >
          Timeline
        </button>
        {showMapTab ? (
          <button
            type="button"
            role="tab"
            aria-selected={tab === "map"}
            className={`swordland-workspace__tab${tab === "map" ? " swordland-workspace__tab--active" : ""}`}
            onClick={() => setTab("map")}
          >
            Carte
          </button>
        ) : null}
      </div>

      {tab === "legion1" ? (
        <div
          className="swordland-workspace__panel"
          role="tabpanel"
          aria-label="Légion 1"
        >
          <LegionBoard
            legion={L1}
            emptyLabel="Aucune donnée Légion 1 — vérifiez le roster principal."
          />
        </div>
      ) : null}

      {tab === "legion2" ? (
        <div
          className="swordland-workspace__panel"
          role="tabpanel"
          aria-label="Légion 2"
        >
          <LegionBoard
            legion={L2}
            emptyLabel="Légion 2 vide — un seul bloc roster suffit, ou collez l’effectif secondaire à l’étape 3."
          />
        </div>
      ) : null}

      {tab === "timeline" ? (
        <div
          className="swordland-workspace__panel swordland-workspace__panel--split"
          role="tabpanel"
          aria-label="Timeline"
        >
          <div className="swordland-timeline-col">
            <p className="swordland-workspace__hint muted">
              Annonces alliance ({eventDurationMinutes} min) — cliquez une phase
              pour l’ajuster.
            </p>
            <RosterDraftTimeline
              phases={mergedGlobal}
              eventDurationMinutes={eventDurationMinutes}
              selectedKey={selectedKey}
              onSelectPhase={onSelectPhase}
              phaseOverlays={tacticalPlan.phaseOverlays}
            />
          </div>
          <div className="swordland-timeline-editor">
            {selectedOriginal ? (
              <>
                <div className="swordland-timeline-editor__head">
                  <p className="swordland-timeline-editor__time">
                    {formatOffsetLabel(selectedOriginal.offsetSeconds, locale)}
                  </p>
                  <p className="muted swordland-timeline-editor__type">
                    {selectedOriginal.phaseType}
                  </p>
                </div>
                <label className="swordland-timeline-editor__field">
                  <span>Titre</span>
                  <input
                    type="text"
                    value={
                      phaseEdits[selectedOriginal.key]?.title ??
                      selectedOriginal.title
                    }
                    onChange={(e) =>
                      onPhaseEdit(selectedOriginal.key, { title: e.target.value })
                    }
                    className="strategy-wizard__input"
                  />
                </label>
                <label className="swordland-timeline-editor__field">
                  <span>Objectif</span>
                  <textarea
                    rows={4}
                    value={
                      phaseEdits[selectedOriginal.key]?.objective ??
                      selectedOriginal.objective
                    }
                    onChange={(e) =>
                      onPhaseEdit(selectedOriginal.key, {
                        objective: e.target.value,
                      })
                    }
                    className="strategy-wizard__textarea strategy-wizard__textarea--compact"
                  />
                </label>
                <label className="swordland-timeline-editor__field">
                  <span>Action</span>
                  <textarea
                    rows={3}
                    value={
                      phaseEdits[selectedOriginal.key]?.action ??
                      selectedOriginal.action
                    }
                    onChange={(e) =>
                      onPhaseEdit(selectedOriginal.key, { action: e.target.value })
                    }
                    className="strategy-wizard__textarea strategy-wizard__textarea--compact"
                  />
                </label>
                <label className="swordland-timeline-editor__field">
                  <span>Indice suivant</span>
                  <textarea
                    rows={2}
                    value={
                      phaseEdits[selectedOriginal.key]?.nextHint ??
                      selectedOriginal.nextHint
                    }
                    onChange={(e) =>
                      onPhaseEdit(selectedOriginal.key, {
                        nextHint: e.target.value,
                      })
                    }
                    className="strategy-wizard__textarea strategy-wizard__textarea--compact"
                  />
                </label>
                <details className="swordland-discord-details">
                  <summary>Aperçu Discord</summary>
                  <TacticalPhasePreview
                    phaseType={selectedOriginal.phaseType}
                    title={
                      phaseEdits[selectedOriginal.key]?.title ??
                      selectedOriginal.title
                    }
                    objective={objectiveForPreview}
                    action={
                      phaseEdits[selectedOriginal.key]?.action ??
                      selectedOriginal.action
                    }
                    nextHint={
                      phaseEdits[selectedOriginal.key]?.nextHint ??
                      selectedOriginal.nextHint
                    }
                    compact
                  />
                </details>
              </>
            ) : (
              <p className="muted">Aucune phase alliance à afficher.</p>
            )}
          </div>
        </div>
      ) : null}

      {tab === "map" && showMapTab ? (
        <div
          className="swordland-workspace__panel"
          role="tabpanel"
          aria-label="Carte"
        >
          <SwordlandTacticalMap legions={tacticalPlan.legions} />
        </div>
      ) : null}
    </div>
  );
}
