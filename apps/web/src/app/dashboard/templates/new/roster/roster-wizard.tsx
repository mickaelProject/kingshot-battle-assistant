"use client";

import Link from "next/link";
import { useLocale } from "next-intl";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import {
  createTemplateFromRosterAction,
  previewRosterTemplateAction,
  type RosterPreviewState,
} from "@/actions/roster-template";
import { EventRosterReview } from "@/components/event-roster-review";
import { RosterEditor } from "@/components/roster-editor";
import {
  SwordlandStrategyWorkspace,
  type SwordlandPhaseEditFields,
} from "@/components/swordland-strategy-workspace";
import { EVENTS } from "@/lib/events/event-registry";
import {
  EVENT_TYPE_PRESETS,
  getEventPresetById,
  presetAllowsWizardFlow,
} from "@/lib/event-type-registry";
import { fmtPowerShort } from "@/lib/roster-generation.service";
import {
  generateRoster,
  type GeneratedRosterResult,
} from "@/lib/roster/generateRoster";
import { parseRosterLines } from "@/lib/roster-template/parse-roster";
import type { AppLocale } from "@/i18n/config";
import { mergeLegionPlayersUnique } from "@/lib/tactical-war-plan";

const DURATION_MIN = 30;
const DURATION_MAX = 180;

const STEP_META = [
  { n: 1, label: "Type", short: "Événement", icon: "⚔" },
  { n: 2, label: "Durée", short: "Temps", icon: "⏱" },
  { n: 3, label: "Roster", short: "Effectifs", icon: "👥" },
  { n: 4, label: "Génération", short: "Synthèse", icon: "✦" },
  { n: 5, label: "Revue", short: "Validation", icon: "◎" },
] as const;

function buildWizardFormData(opts: {
  guildId: string;
  name: string;
  rosterText: string;
  rosterTextLegion2: string;
  notes: string;
  eventDurationMinutes: number;
  eventPresetId: string;
  phaseEdits?: Record<string, SwordlandPhaseEditFields>;
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
  fd.set(
    "phaseEditsJson",
    JSON.stringify(
      opts.phaseEdits && Object.keys(opts.phaseEdits).length > 0
        ? opts.phaseEdits
        : {},
    ),
  );
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
  const [clientResult, setClientResult] = useState<GeneratedRosterResult | null>(
    null,
  );
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
  const [phaseEdits, setPhaseEdits] = useState<
    Record<string, SwordlandPhaseEditFields>
  >({});

  const selectedPreset = getEventPresetById(eventPresetId);
  const evMeta = selectedPreset ? EVENTS[selectedPreset.eventType] : null;
  const isSwordland = selectedPreset?.eventType === "swordland";

  const presetWizardOk =
    selectedPreset != null && presetAllowsWizardFlow(selectedPreset);

  useEffect(() => {
    const p = getEventPresetById(eventPresetId);
    if (!p) return;
    const e = EVENTS[p.eventType];
    if (p.eventType === "swordland") setEventDurationMinutes(60);
    else if (e.duration > 0) setEventDurationMinutes(e.duration);
    else setEventDurationMinutes(45);
  }, [eventPresetId]);

  useEffect(() => {
    setClientResult(null);
    setPreviewState(null);
    setPhaseEdits({});
    setSelectedKey(null);
  }, [eventPresetId]);

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

  const reviewReady = useMemo(() => {
    if (!selectedPreset) return false;
    const et = selectedPreset.eventType;
    const rules = EVENTS[et].generationRules;
    if (et === "swordland") {
      return (
        ok === true &&
        previewState != null &&
        "ok" in previewState &&
        previewState.ok === true
      );
    }
    if (!clientResult) return false;
    if (!rules.useServerTimeline) return true;
    return (
      ok === true &&
      previewState != null &&
      "ok" in previewState &&
      previewState.ok === true
    );
  }, [selectedPreset, ok, previewState, clientResult]);

  function runGenerate() {
    if (!selectedPreset) return;
    const et = selectedPreset.eventType;
    const rules = EVENTS[et].generationRules;
    const legion2Players = rules.dualRosterFields ? liveL2 : [];

    const fd = buildWizardFormData({
      guildId,
      name: templateName,
      rosterText: rosterDraftL1,
      rosterTextLegion2: rules.dualRosterFields ? rosterDraftL2 : "",
      notes,
      eventDurationMinutes,
      eventPresetId,
    });

    if (et === "swordland") {
      startPreviewTransition(async () => {
        const next = await previewRosterTemplateAction(previewState, fd);
        setPreviewState(next);
        if (next && "ok" in next && next.ok === true) {
          setClientResult(null);
          setPhaseEdits({});
          const firstDiscord = next.phases.find(
            (p) => !p.timelineScope || p.timelineScope === "GLOBAL",
          );
          setSelectedKey(firstDiscord?.key ?? next.phases[0]?.key ?? null);
          goToStep(5);
        }
      });
      return;
    }

    if (rules.useServerTimeline) {
      startPreviewTransition(async () => {
        const next = await previewRosterTemplateAction(previewState, fd);
        setPreviewState(next);
        if (next && "ok" in next && next.ok === true) {
          setClientResult(
            generateRoster(et, { legion1: liveL1, legion2: legion2Players }),
          );
          setPhaseEdits({});
          const firstDiscord = next.phases.find(
            (p) => !p.timelineScope || p.timelineScope === "GLOBAL",
          );
          setSelectedKey(firstDiscord?.key ?? next.phases[0]?.key ?? null);
          goToStep(5);
        }
      });
      return;
    }

    startPreviewTransition(() => {
      setPreviewState(null);
      setClientResult(
        generateRoster(et, { legion1: liveL1, legion2: legion2Players }),
      );
      setPhaseEdits({});
      setSelectedKey(null);
      goToStep(5);
    });
  }

  function resetPreview() {
    setPreviewState(null);
    setClientResult(null);
    setSelectedKey(null);
    setPhaseEdits({});
    setStep(4);
    setMaxStepReached((m) => Math.max(m, 4));
  }

  const patchPhaseEdit = useCallback(
    (key: string, patch: SwordlandPhaseEditFields) => {
      setPhaseEdits((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));
    },
    [],
  );

  const rosterLabels = evMeta?.generationRules.rosterGroupLabels ?? {
    a: "Groupe A",
    b: "Groupe B",
  };
  const singleRosterGroup = !evMeta?.generationRules.dualRosterFields;

  return (
    <div className="strategy-wizard roster-war-command-center">
      <header className="strategy-wizard__hero">
        <p className="strategy-wizard__eyebrow">Assistant stratégique</p>
        <h1 className="strategy-wizard__title">
          Nouveau modèle — assistant roster
        </h1>
        <p className="strategy-wizard__lede muted">
          Choisissez un événement Kingshot : la génération adapte la structure
          (légions, rôles, missions, timeline).
        </p>
      </header>

      <nav className="strategy-wizard__steps" aria-label="Étapes du parcours">
        {STEP_META.map((s) => {
          const done = s.n < step || (s.n === 5 && reviewReady);
          const active = s.n === step;
          const locked = s.n === 5 ? !reviewReady : s.n > maxStepReached;
          return (
            <button
              key={s.n}
              type="button"
              className={`strategy-wizard__step-pill ${active ? "strategy-wizard__step-pill--active" : ""} ${done && !active ? "strategy-wizard__step-pill--done" : ""} ${locked ? "strategy-wizard__step-pill--locked" : ""}`}
              disabled={locked}
              onClick={() => {
                if (locked) return;
                if (s.n === 5 && reviewReady) setStep(5);
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
              Registre événements : chaque type impose ses règles de génération
              roster et de timeline (si applicable).
            </p>

            <div className="strategy-wizard__field strategy-wizard__field--event-select">
              <label htmlFor="sw-event-type">
                <span className="strategy-wizard__field-icon" aria-hidden>
                  🎯
                </span>{" "}
                Événement
              </label>
              <select
                id="sw-event-type"
                value={eventPresetId}
                onChange={(e) => setEventPresetId(e.target.value)}
                className="strategy-wizard__select strategy-wizard__select--event"
              >
                {EVENT_TYPE_PRESETS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.icon} {p.label}
                    {p.duration > 0 ? ` · ${p.duration} min` : ""}
                    {p.timingMode === "async" ? " · async" : ""}
                  </option>
                ))}
              </select>
            </div>

            {evMeta ? (
              <div className="strategy-wizard__event-detail">
                <p className="strategy-wizard__event-detail-meta muted">
                  {evMeta.type === "real_time" ? "Temps réel" : "Asynchrone"}
                  {evMeta.duration > 0
                    ? ` · ${evMeta.duration} min`
                    : evMeta.generationRules.useServerTimeline
                      ? ""
                      : " · pas de timeline imposée"}
                  {evMeta.hasLegions ? " · légions" : ""}
                  {evMeta.hasBuildings ? " · bâtiments" : ""}
                </p>
                <p className="strategy-wizard__event-detail-desc">
                  {evMeta.description}
                </p>
              </div>
            ) : null}

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
              {isSwordland
                ? "Swordland Showdown : créneau standard 60 minutes pour la timeline alliance."
                : evMeta?.generationRules.useServerTimeline
                  ? "La timeline des annonces Discord est étalée sur la durée choisie."
                  : "Durée enregistrée sur le modèle (check-lists / brief) — pas de chronomètre d’événement imposé par le registre."}
            </p>

            {isSwordland ? (
              <div className="strategy-wizard__duration-locked">
                <div className="strategy-wizard__duration-value strategy-wizard__duration-value--locked">
                  <strong>60</strong>
                  <span className="muted">min</span>
                </div>
                <p className="strategy-wizard__duration-locked-note muted">
                  Durée fixe Swordland pour caler les phases automatiques.
                </p>
              </div>
            ) : (
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
            )}

            {evMeta?.generationRules.useServerTimeline ? (
              <p className="strategy-wizard__timeline-hint">
                <span aria-hidden>◎</span> La timeline tactique couvrira{" "}
                <strong>T+0 → T+{eventDurationMinutes} min</strong> sans trou.
              </p>
            ) : null}

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
                {singleRosterGroup
                  ? "Effectif : au moins un joueur dans le bloc principal."
                  : `${rosterLabels.a} : au moins un joueur.`}
              </li>
              <li>
                {singleRosterGroup
                  ? "Toute la liste peut tenir dans un seul champ."
                  : `${rosterLabels.b} optionnel selon l’événement.`}
              </li>
            </ul>

            <RosterEditor
              groupALabel={rosterLabels.a}
              groupBLabel={rosterLabels.b}
              groupABadge="Principal"
              groupBBadge="Secondaire"
              singleGroup={singleRosterGroup}
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
              {isSwordland
                ? "Production des phases Swordland, ORBAT bâtiments et brouillons Discord."
                : evMeta?.generationRules.useServerTimeline
                  ? "Génération des phases modèle + plan roster spécifique à l’événement."
                  : "Génération locale du plan roster (tâches, rôles, missions) — le modèle servira de base éditable."}
            </p>

            <div className="strategy-wizard__recap">
              <div className="strategy-wizard__recap-item">
                <span className="muted">Stratégie</span>
                <strong>{templateName.trim() || "—"}</strong>
              </div>
              <div className="strategy-wizard__recap-item">
                <span className="muted">Événement</span>
                <strong>{selectedPreset?.label ?? "—"}</strong>
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
                onClick={runGenerate}
              >
                {previewPending ? (
                  <>Génération en cours…</>
                ) : (
                  <>
                    <span className="strategy-wizard__generate-icon" aria-hidden>
                      ⚡
                    </span>
                    Générer la stratégie
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

        {step === 5 && reviewReady ? (
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
              <strong>Brouillon prêt.</strong>{" "}
              {isSwordland
                ? "Vérifiez ORBAT et phases avant enregistrement."
                : "Vérifiez le plan roster et les phases avant enregistrement."}
              {ok &&
              previewState &&
              "ok" in previewState &&
              previewState.ok === true &&
              !previewState.timelineCoversDuration ? (
                <span className="roster-review-banner__warn">
                  {" "}
                  (Couverture timeline à vérifier.)
                </span>
              ) : null}
            </div>
            {ok &&
            previewState &&
            "ok" in previewState &&
            previewState.ok === true &&
            previewState.warnings.length > 0 ? (
              <ul className="roster-wizard-warnings">
                {previewState.warnings.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            ) : null}

            {isSwordland &&
            ok &&
            previewState &&
            "ok" in previewState &&
            previewState.ok === true ? (
              <>
                <div className="swordland-review-kpi muted">
                  <span>
                    <strong>{previewState.players.length}</strong> joueurs
                  </span>
                  <span className="swordland-review-kpi__sep" aria-hidden>
                    ·
                  </span>
                  <span>
                    <strong>{sortedGlobalPhases.length}</strong> annonces
                    alliance
                  </span>
                  {previewState.phases.length > sortedGlobalPhases.length ? (
                    <>
                      <span className="swordland-review-kpi__sep" aria-hidden>
                        ·
                      </span>
                      <span>
                        +{previewState.phases.length - sortedGlobalPhases.length}{" "}
                        fiches légion (éditeur)
                      </span>
                    </>
                  ) : null}
                  <span className="swordland-review-kpi__sep" aria-hidden>
                    ·
                  </span>
                  <span>
                    RL :{" "}
                    {previewState.leaders.length
                      ? previewState.leaders
                          .slice(0, 6)
                          .map((p) => `${p.name} (${fmtPowerShort(p.power)})`)
                          .join(" · ")
                      : "—"}
                  </span>
                </div>

                <SwordlandStrategyWorkspace
                  tacticalPlan={previewState.tacticalPlan}
                  globalPhases={sortedGlobalPhases}
                  eventDurationMinutes={previewState.echo.eventDurationMinutes}
                  locale={locale}
                  selectedKey={selectedKey}
                  onSelectPhase={setSelectedKey}
                  phaseEdits={phaseEdits}
                  onPhaseEdit={patchPhaseEdit}
                  showMapTab
                />
              </>
            ) : clientResult ? (
              <>
                <div className="swordland-review-kpi muted">
                  <span>
                    <strong>{clientResult.mergedPlayers.length}</strong> joueurs
                  </span>
                  {ok &&
                  previewState &&
                  "ok" in previewState &&
                  previewState.ok === true ? (
                    <>
                      <span className="swordland-review-kpi__sep" aria-hidden>
                        ·
                      </span>
                      <span>
                        <strong>{sortedGlobalPhases.length}</strong> phases
                        (aperçu Discord)
                      </span>
                    </>
                  ) : null}
                </div>
                <EventRosterReview
                  result={clientResult}
                  globalPhases={
                    ok && sortedGlobalPhases.length > 0
                      ? sortedGlobalPhases
                      : undefined
                  }
                  eventDurationMinutes={
                    ok &&
                    previewState &&
                    "ok" in previewState &&
                    previewState.ok === true
                      ? previewState.echo.eventDurationMinutes
                      : eventDurationMinutes
                  }
                  phaseOverlays={
                    ok &&
                    previewState &&
                    "ok" in previewState &&
                    previewState.ok === true
                      ? previewState.tacticalPlan.phaseOverlays
                      : undefined
                  }
                  selectedKey={selectedKey}
                  onSelectPhase={setSelectedKey}
                />
              </>
            ) : null}

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
                    rosterTextLegion2: singleRosterGroup
                      ? ""
                      : rosterDraftL2,
                    notes,
                    eventDurationMinutes,
                    eventPresetId,
                    phaseEdits,
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
                onClick={runGenerate}
              >
                Régénérer
              </button>
            </div>
          </section>
        ) : null}
      </div>

      {previewPending ? (
        <p className="muted strategy-wizard__pending" aria-live="polite">
          Génération du plan…
        </p>
      ) : null}
    </div>
  );
}
