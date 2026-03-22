"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { TimelineScope } from "@/lib/timeline-scope";
import {
  duplicateTemplateAction,
  updateTemplateMetaAction,
} from "@/actions/data";
import { AddPhaseModal } from "@/components/template-editor/add-phase-modal";
import { TemplateMissionFlow } from "@/components/template-mission-flow";
import { TemplateDangerZone } from "@/components/template-editor/template-danger-zone";
import { TemplateDescriptionField } from "@/components/template-editor/template-description-field";
import { DiscordPreview } from "@/components/template/DiscordPreview";
import { PhaseEditor } from "@/components/template/PhaseEditor";
import type { EditorPhase, PhaseLiveDraft } from "@/lib/editor-phase";
import { formatDurationHuman } from "@/lib/time-human";
import { cn } from "@/lib/utils";

type EditorMainTab = "flow" | "preview" | "settings";

export type { EditorPhase };

const SCOPE_TAB_ORDER: TimelineScope[] = ["GLOBAL", "LEGION_1", "LEGION_2"];

const SCOPE_LABELS: Record<TimelineScope, string> = {
  GLOBAL: "Global",
  LEGION_1: "Légion 1",
  LEGION_2: "Légion 2",
};

function sortEditorPhases(a: EditorPhase, b: EditorPhase): number {
  return (
    a.offsetSeconds - b.offsetSeconds ||
    a.orderIndex - b.orderIndex ||
    a.key.localeCompare(b.key)
  );
}

export function TemplateEditorShell({
  templateId,
  name: initialName,
  description: initialDescription,
  eventDurationMinutes: initialEventDurationMinutes,
  legion1StartOffsetMinutes: initialLegion1StartOffsetMinutes = 0,
  legion2StartOffsetMinutes: initialLegion2StartOffsetMinutes = 0,
  eventProductKey,
  phases,
  draftSource,
}: {
  templateId: string;
  name: string;
  description: string | null;
  eventDurationMinutes: number;
  /** Minutes après le début alliance (annonces Discord) avant le T+0 timeline Légion 1. */
  legion1StartOffsetMinutes?: number;
  legion2StartOffsetMinutes?: number;
  eventProductKey: string | null;
  phases: EditorPhase[];
  /** Brouillon auto depuis roster. */
  draftSource?: "roster" | null;
}) {
  const tabScopes = useMemo((): TimelineScope[] => {
    const present = new Set(phases.map((p) => p.timelineScope));
    return SCOPE_TAB_ORDER.filter((s) => present.has(s));
  }, [phases]);

  const showTabs = tabScopes.length > 1;

  const [activeScope, setActiveScope] = useState<TimelineScope>("GLOBAL");

  useEffect(() => {
    if (!tabScopes.includes(activeScope)) {
      setActiveScope(tabScopes[0] ?? "GLOBAL");
    }
  }, [tabScopes, activeScope]);

  const visiblePhases = useMemo(() => {
    if (!showTabs) return [...phases].sort(sortEditorPhases);
    return phases
      .filter((p) => p.timelineScope === activeScope)
      .sort(sortEditorPhases);
  }, [phases, activeScope, showTabs]);

  const reorderScope: TimelineScope = showTabs ? activeScope : "GLOBAL";

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoverPhaseId, setHoverPhaseId] = useState<string | null>(null);
  const [mainTab, setMainTab] = useState<EditorMainTab>("flow");
  const [addPhaseModalOpen, setAddPhaseModalOpen] = useState(false);

  const selectPhaseOpenPreview = (id: string) => {
    setSelectedId(id);
    setMainTab("preview");
  };

  useEffect(() => {
    if (selectedId == null) return;
    if (!visiblePhases.some((p) => p.id === selectedId)) {
      setSelectedId(null);
    }
  }, [visiblePhases, selectedId]);

  const selected = visiblePhases.find((p) => p.id === selectedId) ?? null;

  const [liveDiscordDraft, setLiveDiscordDraft] =
    useState<PhaseLiveDraft | null>(null);

  const handleLiveDiscordDraft = useCallback((d: PhaseLiveDraft) => {
    setLiveDiscordDraft(d);
  }, []);

  useEffect(() => {
    setLiveDiscordDraft(null);
  }, [selectedId]);

  const phasesForDiscordPreview = useMemo(() => {
    if (!selectedId || !liveDiscordDraft) return visiblePhases;
    return visiblePhases.map((p) =>
      p.id === selectedId ? { ...p, ...liveDiscordDraft } : p,
    );
  }, [visiblePhases, selectedId, liveDiscordDraft]);

  const timelineSpanSec = useMemo(() => {
    if (phases.length === 0) return 0;
    return Math.max(...phases.map((p) => p.offsetSeconds));
  }, [phases]);

  const legionAllianceOffsetMinutes =
    activeScope === "LEGION_1"
      ? initialLegion1StartOffsetMinutes
      : activeScope === "LEGION_2"
        ? initialLegion2StartOffsetMinutes
        : 0;

  const scopeHint =
    activeScope === "GLOBAL"
      ? "Timeline alliance : ce sont ces phases que le bot publie sur Discord (T+)."
      : "Plan tactique de légion : consigne interne — non postée automatiquement par le bot. Les T+ affichés sont relatifs à la légion ; l’horloge « alliance » tient compte du décalage défini dans Réglages.";

  const showLegionOffsetFields = tabScopes.some(
    (s) => s === "LEGION_1" || s === "LEGION_2",
  );

  return (
    <div className="dashboard-main template-editor">
      {draftSource === "roster" ? (
        <div className="strategy-draft-banner strategy-draft-banner--roster" role="status">
          <strong>Brouillon généré depuis un roster</strong>
          <p className="muted">
            Phases proposées à partir des joueurs et puissances : relis chaque message
            Discord, la durée événement et la timeline avant un lancement réel.
          </p>
        </div>
      ) : null}
      <header className="mb-8 border-b border-[#1e2230] pb-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <div className="font-rajdhani text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-500/80">
              Éditeur de modèle
            </div>
            <h1 className="mt-1 font-rajdhani text-3xl font-bold tracking-tight text-slate-100 md:text-[2rem]">
              {initialName}
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-500">
              Onglets : déroulé, Discord / édition, réglages — une vue à la fois,
              pleine largeur.
            </p>
          </div>
          <div className="flex flex-shrink-0 flex-wrap items-center gap-2">
            <Link
              href={`/dashboard/templates/${templateId}`}
              className="rounded-lg border border-[#2a3042] bg-[#0a0c10] px-3 py-2 text-xs font-medium text-slate-400 transition-colors hover:border-[#3f4654] hover:text-slate-200"
            >
              Aperçu lecture seule
            </Link>
            <form action={duplicateTemplateAction}>
              <input type="hidden" name="templateId" value={templateId} />
              <button
                type="submit"
                className="rounded-lg border border-[#2a3042] bg-[#13151c] px-3 py-2 text-xs font-semibold text-slate-300 transition-colors hover:border-[#3f4654] hover:text-white"
              >
                Dupliquer
              </button>
            </form>
            <Link
              href={`/dashboard/events?templateId=${encodeURIComponent(templateId)}`}
              className="inline-flex rounded-lg bg-amber-500 px-4 py-2 text-sm font-bold text-black shadow-[0_0_20px_rgba(245,158,11,0.25)] transition-colors hover:bg-amber-400"
            >
              Lancer ce modèle
            </Link>
          </div>
        </div>
      </header>

      <nav
        className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
        aria-label="Sections de l’éditeur"
      >
        <div
          className="flex w-full flex-wrap gap-1 rounded-2xl border border-[#1e2230] bg-[#121826] p-1.5 shadow-lg shadow-black/25 ring-1 ring-white/[0.04] sm:max-w-3xl"
          role="tablist"
        >
          {[
            {
              id: "flow" as const,
              label: "Mission flow",
              sub: "Déroulé & ordre",
            },
            {
              id: "preview" as const,
              label: "Discord & édition",
              sub: selected ? "Phase sélectionnée" : "Aperçu + panneau",
            },
            {
              id: "settings" as const,
              label: "Réglages",
              sub: "Modèle & zone danger",
            },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              id={`editor-tab-${t.id}`}
              aria-selected={mainTab === t.id}
              aria-controls={`editor-panel-${t.id}`}
              className={cn(
                "min-h-[52px] min-w-0 flex-1 rounded-xl px-3 py-2 text-left transition-all sm:min-w-[140px]",
                mainTab === t.id
                  ? "bg-[#0B0F17] text-slate-100 shadow-md ring-1 ring-amber-500/35"
                  : "text-slate-500 hover:bg-[#0B0F17]/60 hover:text-slate-300",
              )}
              onClick={() => setMainTab(t.id)}
            >
              <span className="block font-rajdhani text-sm font-bold tracking-tight">
                {t.label}
              </span>
              <span className="mt-0.5 block text-[10px] leading-tight text-slate-600">
                {t.sub}
              </span>
            </button>
          ))}
        </div>
        {mainTab === "flow" ? (
          <p className="text-xs text-slate-600 sm:max-w-xs sm:text-right">
            Clic sur une carte → onglet{" "}
            <span className="text-slate-400">Discord & édition</span>
          </p>
        ) : null}
      </nav>

      <div className="relative min-h-[min(70vh,900px)] pb-24">
        {/* Panneaux montés en permanence (display) pour ne pas perdre les brouillons d’édition */}
        <div
          id="editor-panel-settings"
          role="tabpanel"
          aria-labelledby="editor-tab-settings"
          hidden={mainTab !== "settings"}
        >
          <div className="mx-auto flex max-w-2xl flex-col gap-4">
            <div className="font-rajdhani text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              Mission settings
            </div>
            <form
              action={updateTemplateMetaAction}
              id="template-meta-form"
              className="space-y-4"
            >
              <input type="hidden" name="id" value={templateId} />
              <div className="rounded-2xl border border-[#1e2230] bg-[#121826] p-4 shadow-lg shadow-black/30 ring-1 ring-white/[0.04]">
                <p className="mb-3 font-rajdhani text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Identité
                </p>
                <div className="space-y-3">
                  <div>
                    <label
                      htmlFor="meta-name"
                      className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-600"
                    >
                      Nom du modèle
                    </label>
                    <input
                      id="meta-name"
                      name="name"
                      type="text"
                      defaultValue={initialName}
                      required
                      className="w-full rounded-lg border border-[#1e2230] bg-[#0a0c10] px-3 py-2.5 text-sm text-slate-200 outline-none transition-shadow focus:border-amber-500/40 focus:ring-2 focus:ring-amber-500/15"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="meta-desc"
                      className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-600"
                    >
                      Description (interne)
                    </label>
                    <TemplateDescriptionField
                      id="meta-desc"
                      name="description"
                      defaultValue={initialDescription ?? ""}
                    />
                  </div>
                </div>
              </div>
              <div className="rounded-2xl border border-[#1e2230] bg-[#121826] p-4 shadow-lg shadow-black/30 ring-1 ring-white/[0.04]">
                <p className="mb-3 font-rajdhani text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Durée événement
                </p>
                <label
                  htmlFor="meta-event-duration"
                  className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-600"
                >
                  Durée de l’événement (minutes, in-game)
                </label>
                <input
                  id="meta-event-duration"
                  name="eventDurationMinutes"
                  type="number"
                  min={1}
                  max={1440}
                  defaultValue={initialEventDurationMinutes}
                  className="w-full rounded-lg border border-[#1e2230] bg-[#0a0c10] px-3 py-2.5 text-sm text-slate-200 outline-none transition-shadow focus:border-amber-500/40 focus:ring-2 focus:ring-amber-500/15"
                />
                <p className="mt-2 text-xs text-slate-600">
                  Contexte pour la mission : dernière annonce à environ{" "}
                  <strong className="text-slate-400">
                    {formatDurationHuman(timelineSpanSec)}
                  </strong>
                  . Les T+ des phases ne sont pas recalculés automatiquement —
                  ajustez-les si vous changez la durée.
                </p>
              </div>
              {showLegionOffsetFields ? (
                <div className="rounded-2xl border border-[#1e2230] bg-[#121826] p-4 shadow-lg shadow-black/30 ring-1 ring-white/[0.04]">
                  <p className="mb-3 font-rajdhani text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Décalage des timelines légions
                  </p>
                  <p className="mb-3 text-xs leading-relaxed text-slate-600">
                    Valeurs de référence pour l’éditeur et{" "}
                    <strong className="text-slate-400">
                      préréglage au lancement
                    </strong>{" "}
                    (Événements → Lancer une bataille), où vous pouvez ajuster
                    le décalage pour chaque bataille. Minutes après le T+0
                    alliance ; les phases légion restent en T+ relatif légion.
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label
                        htmlFor="meta-legion1-offset"
                        className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-600"
                      >
                        Légion 1 — début (min après alliance)
                      </label>
                      <input
                        id="meta-legion1-offset"
                        name="legion1StartOffsetMinutes"
                        type="number"
                        min={0}
                        max={1440}
                        defaultValue={initialLegion1StartOffsetMinutes}
                        className="w-full rounded-lg border border-[#1e2230] bg-[#0a0c10] px-3 py-2.5 text-sm text-slate-200 outline-none transition-shadow focus:border-amber-500/40 focus:ring-2 focus:ring-amber-500/15"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="meta-legion2-offset"
                        className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-600"
                      >
                        Légion 2 — début (min après alliance)
                      </label>
                      <input
                        id="meta-legion2-offset"
                        name="legion2StartOffsetMinutes"
                        type="number"
                        min={0}
                        max={1440}
                        defaultValue={initialLegion2StartOffsetMinutes}
                        className="w-full rounded-lg border border-[#1e2230] bg-[#0a0c10] px-3 py-2.5 text-sm text-slate-200 outline-none transition-shadow focus:border-amber-500/40 focus:ring-2 focus:ring-amber-500/15"
                      />
                    </div>
                  </div>
                </div>
              ) : null}
            </form>
            <TemplateDangerZone
              templateId={templateId}
              templateName={initialName}
            />
            <button
              type="submit"
              form="template-meta-form"
              className="w-full rounded-2xl bg-amber-500 py-3.5 text-sm font-bold text-black shadow-[0_0_28px_rgba(245,158,11,0.25)] transition-colors hover:bg-amber-400"
            >
              Enregistrer les infos
            </button>
          </div>
        </div>

        <div
          id="editor-panel-flow"
          role="tabpanel"
          aria-labelledby="editor-tab-flow"
          hidden={mainTab !== "flow"}
        >
          <div
            id="mission-flow-column"
            className="template-editor__col template-editor__col--center relative mx-auto max-w-4xl min-w-0"
          >
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <div>
                <div className="font-rajdhani text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-500/80">
                  Mission flow
                </div>
                <h2 className="mt-1 font-rajdhani text-xl font-bold text-slate-100">
                  Déroulé de bataille
                </h2>
                <p className="mt-1 text-xs text-slate-600">
                  {visiblePhases.length} phases · {initialEventDurationMinutes}{" "}
                  min — glisser les poignées pour réordonner.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAddPhaseModalOpen(true)}
                className="shrink-0 rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-2.5 text-xs font-bold text-amber-500 shadow-sm transition-all hover:border-amber-500/60 hover:bg-amber-500/15"
              >
                + Ajouter une phase
              </button>
            </div>

            {showTabs ? (
              <>
                <div
                  className="template-editor__scope-tabs mb-4"
                  role="tablist"
                  aria-label="Portée de la timeline"
                >
                  {tabScopes.map((s) => (
                    <button
                      key={s}
                      type="button"
                      role="tab"
                      aria-selected={activeScope === s}
                      className={`template-editor__scope-tab ${activeScope === s ? "template-editor__scope-tab--on" : ""}`}
                      onClick={() => setActiveScope(s)}
                    >
                      {SCOPE_LABELS[s]}
                    </button>
                  ))}
                </div>
                <p className="template-editor__scope-hint muted mb-4">
                  {scopeHint}
                </p>
              </>
            ) : null}

            <div className="rounded-2xl border border-[#1e2230] bg-[#121826] p-4 shadow-xl shadow-black/40 ring-1 ring-white/[0.05] md:p-5">
              <TemplateMissionFlow
                phases={visiblePhases}
                templateId={templateId}
                timelineScope={reorderScope}
                selectedId={selectedId}
                onSelectPhase={selectPhaseOpenPreview}
                onHoverPhase={setHoverPhaseId}
                eventDurationMinutes={initialEventDurationMinutes}
                legionAllianceOffsetMinutes={legionAllianceOffsetMinutes}
              />
            </div>

            <AddPhaseModal
              open={addPhaseModalOpen}
              onClose={() => setAddPhaseModalOpen(false)}
              templateId={templateId}
              timelineScope={reorderScope}
            />
          </div>

          <button
            type="button"
            onClick={() => setAddPhaseModalOpen(true)}
            className="fixed bottom-8 left-1/2 z-40 flex h-14 w-14 -translate-x-1/2 items-center justify-center rounded-full border border-amber-500/40 bg-amber-500 text-xl font-bold text-black shadow-[0_8px_32px_rgba(245,158,11,0.35)] transition-transform hover:scale-105 hover:bg-amber-400"
            title="Ajouter une phase"
            aria-label="Ajouter une phase"
          >
            +
          </button>
        </div>

        <div
          id="editor-panel-preview"
          role="tabpanel"
          aria-labelledby="editor-tab-preview"
          hidden={mainTab !== "preview"}
        >
          <div className="mx-auto w-full max-w-[1440px] space-y-3">
            <div className="font-rajdhani text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
              Discord & édition — un seul aperçu, mis à jour en direct
            </div>
            <div className="grid min-h-[min(76vh,880px)] grid-cols-1 gap-4 xl:grid-cols-2 xl:items-stretch xl:gap-6">
              <div className="flex min-h-0 min-w-0 flex-col gap-2">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-rajdhani text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-600">
                    Aperçu Discord
                  </span>
                  <span className="text-[10px] text-slate-600">
                    Live · champs + override
                  </span>
                </div>
                <div className="flex min-h-[280px] flex-1 flex-col overflow-hidden rounded-2xl border border-[#1e2230] bg-[#121826] shadow-xl shadow-black/35 ring-1 ring-white/[0.05] xl:min-h-0">
                  <DiscordPreview
                    phases={phasesForDiscordPreview}
                    durationMinutes={initialEventDurationMinutes}
                    highlightPhaseId={selectedId}
                    layoutMode="focused"
                    onPhaseChange={setSelectedId}
                    className="h-full min-h-[260px] flex-1 rounded-none border-0"
                  />
                </div>
              </div>

              <div className="flex min-h-0 min-w-0 flex-col">
                <div className="flex min-h-[min(52vh,600px)] flex-1 flex-col overflow-hidden rounded-2xl border border-[#1e2230] bg-[#121826] shadow-xl shadow-black/40 ring-1 ring-amber-500/[0.08] xl:min-h-0">
              {selected ? (
                <PhaseEditor
                  phase={selected}
                  templateId={templateId}
                  eventProductKey={eventProductKey}
                  eventDurationMinutes={initialEventDurationMinutes}
                  onClose={() => setSelectedId(null)}
                  onLiveDraftChange={handleLiveDiscordDraft}
                />
              ) : (
                <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-16 text-center">
                  <div className="h-12 w-12 rounded-2xl border border-[#1e2230] bg-[#0B0F17]" />
                  <p className="text-sm font-medium text-slate-400">
                    Aucune phase sélectionnée
                  </p>
                  <p className="max-w-[18rem] text-xs leading-relaxed text-slate-600">
                    Retournez sur l’onglet{" "}
                    <span className="text-slate-400">Mission flow</span> et
                    cliquez une carte pour l’éditer ici.
                  </p>
                  <button
                    type="button"
                    onClick={() => setMainTab("flow")}
                    className="mt-2 rounded-xl border border-amber-500/35 bg-amber-500/10 px-4 py-2 text-xs font-bold text-amber-500 transition-colors hover:bg-amber-500/15"
                  >
                    Ouvrir le mission flow
                  </button>
                </div>
              )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
