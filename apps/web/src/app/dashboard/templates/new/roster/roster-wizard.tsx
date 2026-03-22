"use client";

import Link from "next/link";
import { useLocale } from "next-intl";
import type { CSSProperties } from "react";
import { useCallback, useMemo, useState, useTransition } from "react";
import {
  createTemplateFromRosterAction,
  previewRosterTemplateAction,
  type RosterPreviewState,
} from "@/actions/roster-template";
import { RosterDraftTimeline } from "@/components/roster-draft-timeline";
import { RosterEditor } from "@/components/roster-editor";
import { TacticalOrbatPanel } from "@/components/tactical-orbat-panel";
import { SectionCard } from "@/components/ui/section-card";
import { TacticalPhasePreview } from "@/components/tactical-phase-preview";
import {
  EVENT_TYPE_PRESETS,
  getEventPresetById,
  presetAllowsWizardFlow,
  type EventPresetSupport,
} from "@/lib/event-type-registry";
import { fmtPowerShort } from "@/lib/roster-generation.service";
import { parseRosterLines } from "@/lib/roster-template/parse-roster";
import type { AppLocale } from "@/i18n/config";
import {
  BATTLE_ARCHETYPE_OPTIONS,
  mergeLegionPlayersUnique,
} from "@/lib/tactical-war-plan";
import { formatOffsetLabel } from "@/lib/time-human";

const DURATION_MIN = 30;
const DURATION_MAX = 60;

const STEP_META = [
  { n: 1, label: "Type", short: "Événement", icon: "⚔" },
  { n: 2, label: "Durée", short: "Temps", icon: "⏱" },
  { n: 3, label: "Roster", short: "Effectifs", icon: "👥" },
  { n: 4, label: "Génération", short: "Synthèse", icon: "✦" },
  { n: 5, label: "Revue", short: "Validation", icon: "◎" },
] as const;

function supportPillLabel(s: EventPresetSupport): string {
  if (s === "full") return "Prêt";
  if (s === "partial") return "Partiel";
  return "Bientôt";
}

function buildWizardFormData(opts: {
  guildId: string;
  name: string;
  rosterText: string;
  rosterTextLegion2: string;
  notes: string;
  eventDurationMinutes: number;
  eventPresetId: string;
}): FormData {
  const fd = new FormData();
  fd.set("guildId", opts.guildId);
  fd.set("name", opts.name.trim());
  fd.set("rosterText", opts.rosterText);
  fd.set("rosterTextLegion2", opts.rosterTextLegion2);
  fd.set("notes", opts.notes);
  fd.set("eventType", "FIELD_BATTLE");
  fd.set("playStyle", "balanced");
  fd.set("eventDurationMinutes", String(opts.eventDurationMinutes));
  fd.set("eventPresetId", opts.eventPresetId);
  fd.set("legion1StartOffsetMinutes", "0");
  fd.set("legion2StartOffsetMinutes", "0");
  const preset = getEventPresetById(opts.eventPresetId);
  fd.set(
    "swordlandShowdownPreset",
    opts.eventPresetId === "swordland_showdown" ? "1" : "0",
  );
  fd.set("battleArchetype", preset?.battleArchetype ?? "SWORDLAND");
  return fd;
}

export function RosterTemplateWizard({
  guilds,
}: {
  guilds: { id: string; discordGuildId: string }[];
}) {
  const locale = useLocale() as AppLocale;
  const [step, setStep] = useState(1);
  const [maxStepReached, setMaxStepReached] = useState(1);
  const [previewState, setPreviewState] = useState<RosterPreviewState>(null);
  const [previewPending, startPreviewTransition] = useTransition();
  const [createPending, startCreateTransition] = useTransition();

  const [eventPresetId, setEventPresetId] = useState("swordland_showdown");
  const [guildId, setGuildId] = useState(guilds[0]?.id ?? "");
  const [templateName, setTemplateName] = useState("");
  const [eventDurationMinutes, setEventDurationMinutes] = useState(60);
  const [rosterDraftL1, setRosterDraftL1] = useState("");
  const [rosterDraftL2, setRosterDraftL2] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [reviewTab, setReviewTab] = useState<
    "summary" | "timeline" | "discord"
  >("summary");

  const selectedPreset = getEventPresetById(eventPresetId);
  const presetWizardOk =
    selectedPreset != null && presetAllowsWizardFlow(selectedPreset);

  function goToStep(n: number) {
    setStep(n);
    setMaxStepReached((m) => Math.max(m, n));
  }

  const ok = previewState && "ok" in previewState && previewState.ok === true;
  const err =
    previewState && "ok" in previewState && previewState.ok === false
      ? previewState.error
      : null;

  const busy = previewPending || createPending;

  const liveL1 = useMemo(
    () => parseRosterLines(rosterDraftL1),
    [rosterDraftL1],
  );
  const liveL2 = useMemo(
    () => parseRosterLines(rosterDraftL2),
    [rosterDraftL2],
  );
  const livePlayerCount = useMemo(
    () =>
      mergeLegionPlayersUnique([
        { index: 1, rawLines: [], players: liveL1 },
        { index: 2, rawLines: [], players: liveL2 },
      ]).length,
    [liveL1, liveL2],
  );
  const handleRosterParsed = useCallback(() => {}, []);

  const step1Valid = Boolean(
    guildId && templateName.trim() && presetWizardOk,
  );
  const step3Valid = liveL1.length > 0;

  const sortedGlobalPhases = useMemo(() => {
    if (!previewState || !("ok" in previewState) || previewState.ok !== true) {
      return [];
    }
    return [...previewState.phases]
      .filter((p) => !p.timelineScope || p.timelineScope === "GLOBAL")
      .sort((a, b) => a.orderIndex - b.orderIndex);
  }, [previewState]);

  const selectedPhase =
    ok && previewState.ok
      ? sortedGlobalPhases.find((p) => p.key === selectedKey) ??
        sortedGlobalPhases[0] ??
        null
      : null;

  const selectedOverlay =
    ok && selectedPhase
      ? previewState.tacticalPlan.phaseOverlays.find(
          (o) => o.orderIndex === selectedPhase.orderIndex,
        )
      : null;

  function runPreview() {
    const fd = buildWizardFormData({
      guildId,
      name: templateName,
      rosterText: rosterDraftL1,
      rosterTextLegion2: rosterDraftL2,
      notes,
      eventDurationMinutes,
      eventPresetId,
    });
    startPreviewTransition(async () => {
      const next = await previewRosterTemplateAction(previewState, fd);
      setPreviewState(next);
      if (next && "ok" in next && next.ok === true) {
        const firstDiscord = next.phases.find(
          (p) => !p.timelineScope || p.timelineScope === "GLOBAL",
        );
        setSelectedKey(firstDiscord?.key ?? next.phases[0]?.key ?? null);
        goToStep(5);
      }
    });
  }

  function resetPreview() {
    setPreviewState(null);
    setSelectedKey(null);
    setStep(4);
    setMaxStepReached((m) => Math.max(m, 4));
  }

  return (
    <div className="strategy-wizard roster-war-command-center">
      <header className="strategy-wizard__hero">
        <p className="strategy-wizard__eyebrow">Assistant stratégique</p>
        <h1 className="strategy-wizard__title">
          Nouveau modèle — assistant roster
        </h1>
        <p className="strategy-wizard__lede muted">
          Génération tactique complète pour Swordland Showdown ; autres types
          listés comme presets (bientôt).
        </p>
      </header>

      <nav className="strategy-wizard__steps" aria-label="Étapes du parcours">
        {STEP_META.map((s) => {
          const done = s.n < step || (s.n === 5 && ok);
          const active = s.n === step;
          const locked = s.n === 5 ? !ok : s.n > maxStepReached;
          return (
            <button
              key={s.n}
              type="button"
              className={`strategy-wizard__step-pill ${active ? "strategy-wizard__step-pill--active" : ""} ${done && !active ? "strategy-wizard__step-pill--done" : ""} ${locked ? "strategy-wizard__step-pill--locked" : ""}`}
              disabled={locked}
              onClick={() => {
                if (locked) return;
                if (s.n === 5 && ok) setStep(5);
                else if (s.n < 5) setStep(s.n);
              }}
            >
              <span className="strategy-wizard__step-icon" aria-hidden>
                {s.icon}
              </span>
              <span className="strategy-wizard__step-num">{s.n}</span>
              <span className="strategy-wizard__step-label">{s.short}</span>
            </button>
          );
        })}
      </nav>

      <div className="strategy-wizard__panel">
        {err ? <p className="form-error strategy-wizard__error">{err}</p> : null}

        {step === 1 ? (
          <section className="strategy-wizard__step-body" aria-labelledby="sw-s1">
            <h2 id="sw-s1" className="strategy-wizard__step-title">
              <span aria-hidden>⚔</span> Étape 1 — Type d’événement
            </h2>
            <p className="strategy-wizard__step-desc muted">
              Registre produit des types d’événement. Seul Swordland Showdown
              déclenche aujourd’hui la génération roster complète ; les autres
              sont des placeholders « bientôt ».
            </p>

            <div
              className="strategy-wizard__event-grid strategy-wizard__event-grid--presets"
              role="list"
            >
              {EVENT_TYPE_PRESETS.map((p) => {
                const allowed = presetAllowsWizardFlow(p);
                const selected = eventPresetId === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    role="listitem"
                    disabled={!allowed}
                    style={
                      selected
                        ? ({
                            "--preset-accent": p.color,
                          } as CSSProperties)
                        : undefined
                    }
                    className={`strategy-wizard__event-card strategy-wizard__event-card--preset ${selected ? "strategy-wizard__event-card--selected" : ""} ${!allowed ? "strategy-wizard__event-card--disabled" : ""}`}
                    onClick={() => {
                      if (allowed) setEventPresetId(p.id);
                    }}
                  >
                    <span
                      className={`strategy-wizard__preset-support strategy-wizard__preset-support--${p.support}`}
                    >
                      {supportPillLabel(p.support)}
                    </span>
                    <span className="strategy-wizard__event-icon" aria-hidden>
                      {p.icon}
                    </span>
                    <span className="strategy-wizard__event-title">{p.label}</span>
                    <span className="strategy-wizard__event-blurb muted">
                      {p.hint}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="strategy-wizard__meta-grid">
              <div className="strategy-wizard__field">
                <label htmlFor="sw-guild">
                  <span className="strategy-wizard__field-icon" aria-hidden>
                    🏛
                  </span>{" "}
                  Serveur Discord
                </label>
                <select
                  id="sw-guild"
                  value={guildId}
                  onChange={(e) => setGuildId(e.target.value)}
                  className="strategy-wizard__select"
                >
                  {guilds.map((g) => (
                    <option key={g.id} value={g.id}>
                      Guilde · …{g.discordGuildId.slice(-6)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="strategy-wizard__field">
                <label htmlFor="sw-name">
                  <span className="strategy-wizard__field-icon" aria-hidden>
                    ✎
                  </span>{" "}
                  Nom de la stratégie
                </label>
                <input
                  id="sw-name"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="Ex. Samedi 20h — Swordland A"
                  className="strategy-wizard__input"
                />
              </div>
            </div>

            <div className="strategy-wizard__nav">
              <Link
                href="/dashboard/templates/new"
                className="btn btn-ghost btn-small"
              >
                ← Autres modes
              </Link>
              <button
                type="button"
                className="btn btn-primary"
                disabled={!step1Valid}
                onClick={() => goToStep(2)}
              >
                Continuer
              </button>
            </div>
          </section>
        ) : null}

        {step === 2 ? (
          <section className="strategy-wizard__step-body" aria-labelledby="sw-s2">
            <h2 id="sw-s2" className="strategy-wizard__step-title">
              <span aria-hidden>⏱</span> Étape 2 — Durée de l’événement
            </h2>
            <p className="strategy-wizard__step-desc muted">
              La timeline des annonces s’étire ou se compresse automatiquement
              sur toute la durée choisie.
            </p>

            <div className="strategy-wizard__duration-block">
              <div className="strategy-wizard__duration-value">
                <strong>{eventDurationMinutes}</strong>
                <span className="muted">min</span>
              </div>
              <input
                type="range"
                min={DURATION_MIN}
                max={DURATION_MAX}
                step={1}
                value={Math.min(
                  DURATION_MAX,
                  Math.max(DURATION_MIN, eventDurationMinutes),
                )}
                onChange={(e) =>
                  setEventDurationMinutes(parseInt(e.target.value, 10))
                }
                className="strategy-wizard__slider"
                aria-valuemin={DURATION_MIN}
                aria-valuemax={DURATION_MAX}
                aria-valuenow={eventDurationMinutes}
              />
              <div className="strategy-wizard__duration-labels muted">
                <span>{DURATION_MIN} min</span>
                <span>{DURATION_MAX} min</span>
              </div>
              <div className="strategy-wizard__field strategy-wizard__field--inline">
                <label htmlFor="sw-duration-input">Ajustement fin</label>
                <input
                  id="sw-duration-input"
                  type="number"
                  min={DURATION_MIN}
                  max={DURATION_MAX}
                  value={eventDurationMinutes}
                  onChange={(e) => {
                    const v = parseInt(e.target.value, 10);
                    if (Number.isNaN(v)) return;
                    setEventDurationMinutes(
                      Math.min(DURATION_MAX, Math.max(DURATION_MIN, v)),
                    );
                  }}
                  className="strategy-wizard__input strategy-wizard__input--narrow"
                />
              </div>
            </div>

            <p className="strategy-wizard__timeline-hint">
              <span aria-hidden>◎</span> La timeline tactique couvrira{" "}
              <strong>T+0 → T+{eventDurationMinutes} min</strong> sans trou.
            </p>

            <div className="strategy-wizard__nav">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setStep(1)}
              >
                Retour
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => goToStep(3)}
              >
                Continuer
              </button>
            </div>
          </section>
        ) : null}

        {step === 3 ? (
          <section className="strategy-wizard__step-body" aria-labelledby="sw-s3">
            <h2 id="sw-s3" className="strategy-wizard__step-title">
              <span aria-hidden>👥</span> Étape 3 — Rosters
            </h2>
            <p className="strategy-wizard__step-desc muted">
              Une ligne = <code className="roster-code-hint">NOM PUISSANCE</code>{" "}
              (ex. <code className="roster-code-hint">CRICKETTS 3704</code>). Les
              lignes vides sont ignorées.
            </p>
            <ul className="strategy-wizard__roster-hints muted">
              <li>
                {eventPresetId === "swordland_showdown"
                  ? "Légion 1 : au moins un joueur."
                  : "Groupe A : au moins un joueur."}
              </li>
              <li>
                {eventPresetId === "swordland_showdown"
                  ? "Légion 2 optionnelle — vide = une seule légion."
                  : "Groupe B optionnel."}
              </li>
            </ul>

            <RosterEditor
              groupALabel={
                eventPresetId === "swordland_showdown"
                  ? "Légion 1"
                  : "Groupe A"
              }
              groupBLabel={
                eventPresetId === "swordland_showdown"
                  ? "Légion 2"
                  : "Groupe B"
              }
              groupABadge={
                eventPresetId === "swordland_showdown"
                  ? "Principal"
                  : "Principal"
              }
              groupBBadge={
                eventPresetId === "swordland_showdown"
                  ? "Secondaire"
                  : "Secondaire"
              }
              valueA={rosterDraftL1}
              valueB={rosterDraftL2}
              onValueAChange={setRosterDraftL1}
              onValueBChange={setRosterDraftL2}
              onRosterChange={handleRosterParsed}
            />

            <div className="strategy-wizard__nav">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setStep(2)}
              >
                Retour
              </button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={!step3Valid}
                onClick={() => goToStep(4)}
              >
                Continuer
              </button>
            </div>
          </section>
        ) : null}

        {step === 4 ? (
          <section className="strategy-wizard__step-body" aria-labelledby="sw-s4">
            <h2 id="sw-s4" className="strategy-wizard__step-title">
              <span aria-hidden>✦</span> Étape 4 — Génération
            </h2>
            <p className="strategy-wizard__step-desc muted">
              Nous allons produire les phases Swordland, l’ORBAT bâtiments et
              les blocs Discord.
            </p>

            <div className="strategy-wizard__recap">
              <div className="strategy-wizard__recap-item">
                <span className="muted">Stratégie</span>
                <strong>{templateName.trim() || "—"}</strong>
              </div>
              <div className="strategy-wizard__recap-item">
                <span className="muted">Durée</span>
                <strong>{eventDurationMinutes} min</strong>
              </div>
              <div className="strategy-wizard__recap-item">
                <span className="muted">Joueurs (total)</span>
                <strong>{livePlayerCount}</strong>
              </div>
            </div>

            <div className="strategy-wizard__field">
              <label htmlFor="sw-notes">
                <span className="strategy-wizard__field-icon" aria-hidden>
                  📋
                </span>{" "}
                Notes officiers (optionnel)
              </label>
              <textarea
                id="sw-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="strategy-wizard__textarea strategy-wizard__textarea--compact"
                placeholder="Focus nord, double RL, etc."
              />
            </div>

            <div className="strategy-wizard__generate-wrap">
              <button
                type="button"
                className="btn btn-primary strategy-wizard__generate-btn"
                disabled={busy || !step1Valid || !step3Valid}
                onClick={runPreview}
              >
                {previewPending ? (
                  <>Génération en cours…</>
                ) : (
                  <>
                    <span className="strategy-wizard__generate-icon" aria-hidden>
                      ⚡
                    </span>
                    Générer la stratégie Swordland
                  </>
                )}
              </button>
            </div>

            <div className="strategy-wizard__nav">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setStep(3)}
              >
                Retour
              </button>
            </div>
          </section>
        ) : null}

        {step === 5 && ok && previewState.ok ? (
          <section className="strategy-wizard__step-body strategy-wizard__step-body--review">
            <div className="strategy-wizard__review-head">
              <h2 className="strategy-wizard__step-title">
                <span aria-hidden>◎</span> Étape 5 — Revue
              </h2>
              <button
                type="button"
                className="btn btn-ghost btn-small"
                onClick={resetPreview}
              >
                ← Modifier & régénérer
              </button>
            </div>

            <div className="roster-review-banner" role="status">
              <strong>Brouillon prêt.</strong> Vérifiez ORBAT et phases avant
              enregistrement.
              {!previewState.timelineCoversDuration ? (
                <span className="roster-review-banner__warn">
                  {" "}
                  (Couverture timeline à vérifier.)
                </span>
              ) : null}
            </div>
            {previewState.warnings.length > 0 ? (
              <ul className="roster-wizard-warnings">
                {previewState.warnings.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            ) : null}

            <div className="roster-review-tabs roster-war-command-center">
              <div
                className="roster-review-tabs__list"
                role="tablist"
                aria-label="Sections de la revue"
              >
                <button
                  type="button"
                  role="tab"
                  id="roster-review-tab-summary"
                  aria-selected={reviewTab === "summary"}
                  aria-controls="roster-review-panel-summary"
                  className={`roster-review-tabs__tab${reviewTab === "summary" ? " roster-review-tabs__tab--active" : ""}`}
                  onClick={() => setReviewTab("summary")}
                >
                  <span aria-hidden>◆</span> Synthèse &amp; ORBAT
                </button>
                <button
                  type="button"
                  role="tab"
                  id="roster-review-tab-timeline"
                  aria-selected={reviewTab === "timeline"}
                  aria-controls="roster-review-panel-timeline"
                  className={`roster-review-tabs__tab${reviewTab === "timeline" ? " roster-review-tabs__tab--active" : ""}`}
                  onClick={() => setReviewTab("timeline")}
                >
                  <span aria-hidden>◎</span> Timeline
                </button>
                <button
                  type="button"
                  role="tab"
                  id="roster-review-tab-discord"
                  aria-selected={reviewTab === "discord"}
                  aria-controls="roster-review-panel-discord"
                  className={`roster-review-tabs__tab${reviewTab === "discord" ? " roster-review-tabs__tab--active" : ""}`}
                  onClick={() => setReviewTab("discord")}
                >
                  <span aria-hidden>💬</span> Discord
                </button>
              </div>

              {reviewTab === "summary" ? (
                <div
                  className="roster-review-tabs__panel"
                  role="tabpanel"
                  id="roster-review-panel-summary"
                  aria-labelledby="roster-review-tab-summary"
                >
                  <div className="roster-review-tabs__stack">
                    <SectionCard
                      title={
                        <>
                          <span aria-hidden>◆</span> Synthèse
                        </>
                      }
                      subtitle={`${previewState.players.length} joueurs · ${previewState.echo.eventDurationMinutes} min`}
                    >
                      <dl className="roster-review-stats">
                        <dt>Phases</dt>
                        <dd>
                          <strong>{sortedGlobalPhases.length}</strong> annonces
                          Discord
                          {previewState.phases.length >
                          sortedGlobalPhases.length ? (
                            <span className="muted">
                              {" "}
                              ·{" "}
                              {previewState.phases.length -
                                sortedGlobalPhases.length}{" "}
                              fiches légion
                            </span>
                          ) : null}
                        </dd>
                        <dt>Arc</dt>
                        <dd>
                          <strong>
                            {
                              BATTLE_ARCHETYPE_OPTIONS.find(
                                (o) =>
                                  o.value === previewState.echo.battleArchetype,
                              )?.label
                            }
                          </strong>
                        </dd>
                      </dl>
                    </SectionCard>

                    <SectionCard
                      title={
                        <>
                          <span aria-hidden>👤</span> Candidats RL
                        </>
                      }
                      subtitle="Shotcallers indicatifs"
                    >
                      <ul className="roster-leader-list">
                        {previewState.leaders.map((p, i) => (
                          <li key={`${p.name}-${i}`}>
                            <strong>{p.name}</strong>{" "}
                            <span className="muted">
                              ({fmtPowerShort(p.power)})
                            </span>
                          </li>
                        ))}
                      </ul>
                    </SectionCard>

                    <SectionCard
                      title={
                        <>
                          <span aria-hidden>🗺</span> Bâtiments &amp; ORBAT
                        </>
                      }
                      subtitle="Assignations automatiques"
                      className="section-card--orbat"
                    >
                      <TacticalOrbatPanel plan={previewState.tacticalPlan} />
                    </SectionCard>
                  </div>
                </div>
              ) : null}

              {reviewTab === "timeline" ? (
                <div
                  className="roster-review-tabs__panel"
                  role="tabpanel"
                  id="roster-review-panel-timeline"
                  aria-labelledby="roster-review-tab-timeline"
                >
                  <SectionCard
                    title={
                      <>
                        <span aria-hidden>◎</span> Timeline tactique
                      </>
                    }
                    subtitle="Timeline alliance (annonces Discord) — les fiches légion se règlent après enregistrement dans l’éditeur."
                    className="section-card--timeline"
                  >
                    <RosterDraftTimeline
                      phases={sortedGlobalPhases}
                      eventDurationMinutes={
                        previewState.echo.eventDurationMinutes
                      }
                      selectedKey={selectedKey}
                      onSelectPhase={setSelectedKey}
                      phaseOverlays={previewState.tacticalPlan.phaseOverlays}
                    />
                    <div className="tactical-phase-pills" role="list">
                      {sortedGlobalPhases.map((match) => (
                        <button
                          key={match.key}
                          type="button"
                          role="listitem"
                          className="tactical-phase-pill"
                          onClick={() => setSelectedKey(match.key)}
                        >
                          <span className="tactical-phase-pill__t">
                            {formatOffsetLabel(match.offsetSeconds, locale)}
                          </span>
                          <span className="tactical-phase-pill__type">
                            {match.phaseType}
                          </span>
                          <span>{match.title}</span>
                        </button>
                      ))}
                    </div>
                  </SectionCard>
                </div>
              ) : null}

              {reviewTab === "discord" ? (
                <div
                  className="roster-review-tabs__panel"
                  role="tabpanel"
                  id="roster-review-panel-discord"
                  aria-labelledby="roster-review-tab-discord"
                >
                  <p className="roster-review-tabs__hint muted">
                    La phase affichée est celle sélectionnée dans l’onglet{" "}
                    <strong>Timeline</strong>. Passez-y pour choisir une autre
                    annonce.
                  </p>
                  <SectionCard
                    title={
                      <>
                        <span aria-hidden>💬</span> Discord
                      </>
                    }
                    subtitle="Message de la phase sélectionnée"
                  >
                    {selectedPhase ? (
                      <TacticalPhasePreview
                        phaseType={selectedPhase.phaseType}
                        title={selectedPhase.title}
                        objective={
                          selectedOverlay?.markdownAppendix
                            ? `${selectedPhase.objective.trim()}${selectedOverlay.markdownAppendix}`
                            : selectedPhase.objective
                        }
                        action={selectedPhase.action}
                        nextHint={selectedPhase.nextHint}
                      />
                    ) : (
                      <p className="muted">
                        Aucune phase sélectionnée — ouvrez l’onglet{" "}
                        <strong>Timeline</strong> et cliquez une phase.
                      </p>
                    )}
                  </SectionCard>
                </div>
              ) : null}
            </div>

            <div className="btn-row roster-review-bottom-actions">
              <button
                type="button"
                className="btn btn-primary"
                disabled={busy}
                onClick={() => {
                  const fd = buildWizardFormData({
                    guildId,
                    name: templateName,
                    rosterText: rosterDraftL1,
                    rosterTextLegion2: rosterDraftL2,
                    notes,
                    eventDurationMinutes,
                    eventPresetId,
                  });
                  startCreateTransition(async () => {
                    await createTemplateFromRosterAction(fd);
                  });
                }}
              >
                {createPending
                  ? "Enregistrement…"
                  : "Enregistrer et ouvrir l’éditeur"}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                disabled={busy}
                onClick={runPreview}
              >
                Régénérer
              </button>
            </div>
          </section>
        ) : null}
      </div>

      {previewPending ? (
        <p className="muted strategy-wizard__pending" aria-live="polite">
          Génération du plan tactique…
        </p>
      ) : null}
    </div>
  );
}
