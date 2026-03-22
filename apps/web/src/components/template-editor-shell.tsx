"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  addPhaseAction,
  deleteTemplateAction,
  updatePhaseAction,
  updateTemplateMetaAction,
} from "@/actions/data";
import { TacticalPhasePreview } from "@/components/tactical-phase-preview";
import { TemplatePhaseTimeline } from "@/components/template-phase-timeline";
import { ConfirmDestructive } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { PreviewPanel } from "@/components/ui/preview-panel";
import { SectionCard } from "@/components/ui/section-card";
import type { EditorPhase } from "@/lib/editor-phase";
import { formatDurationHuman, formatOffsetLabel } from "@/lib/time-human";

export type { EditorPhase };

type PreviewDraft = Pick<
  EditorPhase,
  "phaseType" | "title" | "objective" | "action" | "nextHint"
>;

const PHASE_TYPES: { id: string; label: string; hint: string }[] = [
  { id: "START", label: "Lancement", hint: "Ouverture de session" },
  { id: "OBJECTIVE", label: "Objectif", hint: "But à atteindre" },
  { id: "REMINDER", label: "Rappel", hint: "Relance horaire" },
  { id: "FINAL", label: "Clôture", hint: "Fin / synthèse" },
];

function minutesFromSeconds(sec: number): number {
  return Math.round((sec / 60) * 100) / 100;
}

function secondsFromMinutes(min: number): number {
  if (!Number.isFinite(min) || min < 0) return 0;
  return Math.round(min * 60);
}

export function TemplateEditorShell({
  templateId,
  name: initialName,
  description: initialDescription,
  eventDurationMinutes: initialEventDurationMinutes,
  phases,
  draftSource,
}: {
  templateId: string;
  name: string;
  description: string | null;
  eventDurationMinutes: number;
  phases: EditorPhase[];
  /** Brouillon auto depuis roster. */
  draftSource?: "roster" | null;
}) {
  const sorted = useMemo(
    () =>
      [...phases].sort(
        (a, b) =>
          a.offsetSeconds - b.offsetSeconds || a.key.localeCompare(b.key),
      ),
    [phases],
  );
  const [selectedId, setSelectedId] = useState<string | null>(
    sorted[0]?.id ?? null,
  );
  const [editDraft, setEditDraft] = useState<PreviewDraft | null>(null);

  useEffect(() => {
    setEditDraft(null);
  }, [selectedId]);

  useEffect(() => {
    if (selectedId && !sorted.some((p) => p.id === selectedId)) {
      setSelectedId(sorted[0]?.id ?? null);
    }
  }, [sorted, selectedId]);

  const selected = sorted.find((p) => p.id === selectedId) ?? null;
  const previewPhase: EditorPhase | null = selected
    ? { ...selected, ...(editDraft ?? {}) }
    : null;

  const timelineSpanSec = useMemo(() => {
    if (sorted.length === 0) return 0;
    return Math.max(...sorted.map((p) => p.offsetSeconds));
  }, [sorted]);

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
      <PageHeader
        title={initialName}
        description="À gauche : infos du scénario et durée sur le terrain. Au centre : le fil des annonces Discord. À droite : aperçu comme dans le salon."
        actions={
          <Link
            href={`/dashboard/templates/${templateId}`}
            className="btn btn-ghost"
          >
            Aperçu lecture seule
          </Link>
        }
      />

      <div className="template-editor__grid">
        <aside className="template-editor__col template-editor__col--left">
          <SectionCard title="Informations">
            <form action={updateTemplateMetaAction} className="form-stack">
              <input type="hidden" name="id" value={templateId} />
              <div className="form-field">
                <label htmlFor="meta-name">Nom du modèle</label>
                <input
                  id="meta-name"
                  name="name"
                  defaultValue={initialName}
                  required
                />
              </div>
              <div className="form-field">
                <label htmlFor="meta-desc">Description (interne)</label>
                <textarea
                  id="meta-desc"
                  name="description"
                  defaultValue={initialDescription ?? ""}
                  rows={3}
                />
              </div>
              <div className="form-field">
                <label htmlFor="meta-event-duration">
                  Durée de l’événement (minutes, in-game)
                </label>
                <input
                  id="meta-event-duration"
                  name="eventDurationMinutes"
                  type="number"
                  min={1}
                  max={1440}
                  defaultValue={initialEventDurationMinutes}
                />
                <p className="field-hint">
                  Brief → fin sur le terrain. Les annonces Discord peuvent s’étaler sur{" "}
                  <strong>~{formatDurationHuman(timelineSpanSec)}</strong> (dernier
                  T+ de la timeline).
                </p>
              </div>
              <button type="submit" className="btn btn-secondary">
                Enregistrer les infos
              </button>
            </form>
          </SectionCard>

          <SectionCard title="Suppression">
            <p className="field-hint">
              À utiliser seulement si plus aucune bataille n’utilise ce modèle.
            </p>
            <ConfirmDestructive
              label="Supprimer ce modèle…"
              confirmLabel="Confirmer la suppression définitive ?"
            >
              <form action={deleteTemplateAction}>
                <input type="hidden" name="id" value={templateId} />
                <button type="submit" className="btn btn-danger">
                  Oui, supprimer
                </button>
              </form>
            </ConfirmDestructive>
          </SectionCard>
        </aside>

        <div className="template-editor__col template-editor__col--center">
          <SectionCard
            className="section-card--timeline"
            title="Fil des annonces"
            subtitle="Grande vue verticale : survol pour l’aperçu Discord, clic pour modifier, poignée pour réordonner."
          >
            <TemplatePhaseTimeline
              phases={sorted}
              templateId={templateId}
              selectedId={selectedId}
              onSelectPhase={setSelectedId}
            />

            {selected ? (
              <PhaseEditForm
                key={selected.id}
                phase={selected}
                templateId={templateId}
                onLivePreview={setEditDraft}
              />
            ) : (
              <EmptyState title="Sélectionne une étape dans la timeline" />
            )}

            <GuidedAddPhase templateId={templateId} />
          </SectionCard>
        </div>

        <aside className="template-editor__col template-editor__col--right">
          <PreviewPanel title="Aperçu Discord">
            {previewPhase ? (
              <TacticalPhasePreview
                phaseType={previewPhase.phaseType}
                title={previewPhase.title}
                objective={previewPhase.objective}
                action={previewPhase.action}
                nextHint={previewPhase.nextHint}
              />
            ) : (
              <p className="muted">Choisis une étape à gauche.</p>
            )}
          </PreviewPanel>
        </aside>
      </div>
    </div>
  );
}

function PhaseEditForm({
  phase,
  templateId,
  onLivePreview,
}: {
  phase: EditorPhase;
  templateId: string;
  onLivePreview: (d: PreviewDraft | null) => void;
}) {
  const [minutes, setMinutes] = useState(minutesFromSeconds(phase.offsetSeconds));
  const [phaseType, setPhaseType] = useState(phase.phaseType);
  const [title, setTitle] = useState(phase.title);
  const [objective, setObjective] = useState(phase.objective);
  const [action, setAction] = useState(phase.action);
  const [nextHint, setNextHint] = useState(phase.nextHint);
  const [advOpen, setAdvOpen] = useState(false);
  const [keyDraft, setKeyDraft] = useState(phase.key);

  useEffect(() => {
    setMinutes(minutesFromSeconds(phase.offsetSeconds));
    setPhaseType(phase.phaseType);
    setTitle(phase.title);
    setObjective(phase.objective);
    setAction(phase.action);
    setNextHint(phase.nextHint);
    setKeyDraft(phase.key);
    setAdvOpen(false);
  }, [phase]);

  useEffect(() => {
    onLivePreview({ phaseType, title, objective, action, nextHint });
  }, [phaseType, title, objective, action, nextHint, onLivePreview]);

  return (
    <div className="phase-edit-box">
      <h3 className="phase-edit-box__title">Modifier l’étape</h3>
      <form action={updatePhaseAction} className="form-stack">
        <input type="hidden" name="id" value={phase.id} />
        <input type="hidden" name="templateId" value={templateId} />
        <input type="hidden" name="key" value={keyDraft} />
        <input
          type="hidden"
          name="offsetSeconds"
          value={String(secondsFromMinutes(minutes))}
        />
        <input type="hidden" name="phaseType" value={phaseType} />

        <div className="form-field">
          <label>Temps après le début (minutes)</label>
          <input
            type="number"
            min={0}
            step={0.25}
            value={minutes}
            onChange={(e) => setMinutes(parseFloat(e.target.value) || 0)}
          />
          <p className="field-hint">
            Affichage Discord : {formatOffsetLabel(secondsFromMinutes(minutes))}
          </p>
        </div>

        <div className="form-field">
          <label>Type d’étape</label>
          <div className="segmented-phase">
            {PHASE_TYPES.map((pt) => (
              <button
                key={pt.id}
                type="button"
                className={`segmented-phase__btn ${phaseType === pt.id ? "segmented-phase__btn--on" : ""}`}
                onClick={() => setPhaseType(pt.id)}
              >
                <span className="segmented-phase__label">{pt.label}</span>
                <span className="segmented-phase__hint">{pt.hint}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="form-field">
          <label htmlFor={`ed-title-${phase.id}`}>Titre (grand texte Discord)</label>
          <input
            id={`ed-title-${phase.id}`}
            name="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>
        <div className="form-field">
          <label htmlFor={`ed-obj-${phase.id}`}>Objectif</label>
          <textarea
            id={`ed-obj-${phase.id}`}
            name="objective"
            value={objective}
            onChange={(e) => setObjective(e.target.value)}
            rows={2}
          />
        </div>
        <div className="form-field">
          <label htmlFor={`ed-act-${phase.id}`}>Action demandée</label>
          <textarea
            id={`ed-act-${phase.id}`}
            name="action"
            value={action}
            onChange={(e) => setAction(e.target.value)}
            rows={2}
          />
        </div>
        <div className="form-field">
          <label htmlFor={`ed-next-${phase.id}`}>Prochaine étape (indice)</label>
          <textarea
            id={`ed-next-${phase.id}`}
            name="nextHint"
            value={nextHint}
            onChange={(e) => setNextHint(e.target.value)}
            rows={2}
          />
        </div>

        <button
          type="button"
          className="btn btn-ghost btn-small"
          onClick={() => setAdvOpen(!advOpen)}
        >
          {advOpen ? "▼ Masquer avancé" : "▶ Options avancées"}
        </button>
        {advOpen ? (
          <div className="advanced-block">
            <p className="field-hint">
              Clé technique (commandes bot) — ne modifie que si nécessaire.
            </p>
            <div className="form-field">
              <label htmlFor={`ed-key-${phase.id}`}>Clé</label>
              <input
                id={`ed-key-${phase.id}`}
                value={keyDraft}
                onChange={(e) => setKeyDraft(e.target.value)}
                autoComplete="off"
              />
            </div>
          </div>
        ) : null}

        <button type="submit" className="btn btn-primary">
          Enregistrer l’étape
        </button>
      </form>
    </div>
  );
}

function GuidedAddPhase({ templateId }: { templateId: string }) {
  const [minutes, setMinutes] = useState(0);
  const [phaseType, setPhaseType] = useState("REMINDER");
  const [title, setTitle] = useState("");
  const [objective, setObjective] = useState("");
  const [action, setAction] = useState("");
  const [nextHint, setNextHint] = useState("");

  return (
    <div className="phase-edit-box phase-edit-box--add">
      <h3 className="phase-edit-box__title">Ajouter une étape</h3>
      <form
        action={addPhaseAction}
        className="form-stack"
        onSubmit={(e) => {
          if (!title.trim()) e.preventDefault();
        }}
      >
        <input type="hidden" name="templateId" value={templateId} />
        <input type="hidden" name="key" value="" />
        <input
          type="hidden"
          name="offsetSeconds"
          value={String(secondsFromMinutes(minutes))}
        />
        <input type="hidden" name="phaseType" value={phaseType} />

        <div className="form-field">
          <label>Minutes après le début</label>
          <input
            type="number"
            min={0}
            step={0.25}
            value={minutes}
            onChange={(e) => setMinutes(parseFloat(e.target.value) || 0)}
          />
        </div>
        <div className="segmented-phase">
          {PHASE_TYPES.map((pt) => (
            <button
              key={pt.id}
              type="button"
              className={`segmented-phase__btn ${phaseType === pt.id ? "segmented-phase__btn--on" : ""}`}
              onClick={() => setPhaseType(pt.id)}
            >
              <span className="segmented-phase__label">{pt.label}</span>
              <span className="segmented-phase__hint">{pt.hint}</span>
            </button>
          ))}
        </div>
        <div className="form-field">
          <label>Titre</label>
          <input
            name="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            placeholder="Ex. Focus porte sud"
          />
        </div>
        <div className="form-field">
          <label>Objectif</label>
          <textarea
            name="objective"
            value={objective}
            onChange={(e) => setObjective(e.target.value)}
            rows={2}
          />
        </div>
        <div className="form-field">
          <label>Action</label>
          <textarea
            name="action"
            value={action}
            onChange={(e) => setAction(e.target.value)}
            rows={2}
          />
        </div>
        <div className="form-field">
          <label>Indice « suite »</label>
          <textarea
            name="nextHint"
            value={nextHint}
            onChange={(e) => setNextHint(e.target.value)}
            rows={2}
          />
        </div>

        <div className="add-preview-inline">
          <span className="muted">Aperçu live</span>
          <TacticalPhasePreview
            phaseType={phaseType}
            title={title || "…"}
            objective={objective}
            action={action}
            nextHint={nextHint}
            compact
            showMessageChrome={false}
          />
        </div>

        <button type="submit" className="btn btn-primary" disabled={!title.trim()}>
          Ajouter à la timeline
        </button>
      </form>
    </div>
  );
}
