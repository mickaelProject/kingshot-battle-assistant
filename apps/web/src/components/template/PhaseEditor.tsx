"use client";

import { useLocale } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import type { AppLocale } from "@/i18n/config";
import {
  clearPhaseDiscordOverrideAction,
  restorePhaseDiscordDraftAction,
  updatePhaseAction,
} from "@/actions/data";
import type { EditorPhase, PhaseLiveDraft } from "@/lib/editor-phase";
import { phaseStyles, type PhaseStyleKey } from "@/lib/phaseStyles";
import { formatOffsetLabel } from "@/lib/time-human";

function minutesFromSeconds(sec: number): number {
  return Math.round((sec / 60) * 100) / 100;
}

function secondsFromMinutes(min: number): number {
  if (!Number.isFinite(min) || min < 0) return 0;
  return Math.round(min * 60);
}

function isPhaseStyleKey(v: string): v is PhaseStyleKey {
  return Object.prototype.hasOwnProperty.call(phaseStyles, v);
}

const PHASE_ENTRIES = Object.entries(phaseStyles) as [
  PhaseStyleKey,
  (typeof phaseStyles)[PhaseStyleKey],
][];

const editorScrollClass =
  "min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-5 py-4 [scrollbar-color:rgba(55,65,81,0.85)_transparent] [scrollbar-width:thin]";

const textareaClass =
  "w-full max-h-36 min-h-[4.5rem] resize-none overflow-y-auto rounded-xl border border-[#1e2230] bg-[#0B0F17] px-3 py-2 text-sm leading-snug text-slate-200 [scrollbar-color:rgba(55,65,81,0.85)_transparent] [scrollbar-width:thin] focus:border-amber-500/45 focus:outline-none focus:ring-1 focus:ring-amber-500/15";

const inputClass =
  "w-full rounded-xl border border-[#1e2230] bg-[#0B0F17] px-3 py-2 text-sm text-slate-200 focus:border-amber-500/45 focus:outline-none focus:ring-1 focus:ring-amber-500/15";

type PhaseEditorProps = {
  phase: EditorPhase | null;
  templateId: string;
  eventProductKey: string | null;
  eventDurationMinutes?: number;
  onClose: () => void;
  onLiveDraftChange?: (draft: PhaseLiveDraft) => void;
};

/** Remonte le brouillon vers l’aperçu Discord (pas d’embed dupliqué dans le panneau). */
export function PhaseEditor(props: PhaseEditorProps) {
  if (!props.phase) return null;
  return <PhaseEditorForm key={props.phase.id} {...props} phase={props.phase} />;
}

function PhaseEditorForm({
  phase,
  templateId,
  eventProductKey,
  eventDurationMinutes = 120,
  onClose,
  onLiveDraftChange,
}: Omit<PhaseEditorProps, "phase"> & { phase: EditorPhase }) {
  const [minutes, setMinutes] = useState(() =>
    minutesFromSeconds(phase.offsetSeconds),
  );
  const [phaseType, setPhaseType] = useState<PhaseStyleKey>(() =>
    isPhaseStyleKey(phase.phaseType) ? phase.phaseType : "REMINDER",
  );
  const [title, setTitle] = useState(() => phase.title);
  const [objective, setObjective] = useState(() => phase.objective);
  const [action, setAction] = useState(() => phase.action);
  const [nextHint, setNextHint] = useState(() => phase.nextHint);
  const [buildingsText, setBuildingsText] = useState(() =>
    phase.targetedBuildings.join("\n"),
  );
  const [leadersText, setLeadersText] = useState(() =>
    phase.assignedLeaders.join("\n"),
  );
  const [playersText, setPlayersText] = useState(() =>
    phase.assignedPlayers.join("\n"),
  );
  const [customDiscord, setCustomDiscord] = useState(
    () => phase.customDiscordText ?? "",
  );
  const [advOpen, setAdvOpen] = useState(false);
  const [keyDraft, setKeyDraft] = useState(() => phase.key);
  const locale = useLocale() as AppLocale;

  const pushLiveDraft = useCallback(() => {
    if (!onLiveDraftChange) return;
    onLiveDraftChange({
      title,
      objective,
      action,
      nextHint,
      phaseType,
      offsetSeconds: secondsFromMinutes(minutes),
      customDiscordText: customDiscord.trim() ? customDiscord : null,
    });
  }, [
    onLiveDraftChange,
    title,
    objective,
    action,
    nextHint,
    phaseType,
    minutes,
    customDiscord,
  ]);

  useEffect(() => {
    pushLiveDraft();
  }, [pushLiveDraft]);

  const timeMax = Math.max(1, Math.min(1440, eventDurationMinutes));

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#121826]">
      <form
        action={updatePhaseAction}
        className="flex min-h-0 flex-1 flex-col"
      >
        <input type="hidden" name="id" value={phase.id} />
        <input type="hidden" name="templateId" value={templateId} />
        <input type="hidden" name="timelineScope" value={phase.timelineScope} />
        <input type="hidden" name="key" value={keyDraft} />
        <input
          type="hidden"
          name="offsetSeconds"
          value={String(secondsFromMinutes(minutes))}
        />
        <input type="hidden" name="phaseType" value={phaseType} />

        <div className="flex flex-shrink-0 items-center justify-between gap-3 border-b border-[#1e2230] bg-[#121826]/95 px-4 py-3 sm:px-5">
          <div className="min-w-0 flex-1">
            <div className="font-rajdhani text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-500/80">
              Édition tactique
            </div>
            <div className="truncate font-rajdhani text-sm font-semibold text-slate-100">
              {title.trim() || "Phase sans titre"}
            </div>
            <p className="mt-0.5 text-[10px] text-slate-600">
              Aperçu Discord à gauche — une seule prévisualisation
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="submit"
              className="rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-black shadow-[0_0_20px_rgba(245,158,11,0.2)] transition-colors hover:bg-amber-400"
            >
              Enregistrer
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-xl border border-[#1e2230] text-slate-500 transition-all hover:bg-[#0B0F17] hover:text-slate-300"
              aria-label="Fermer"
            >
              ✕
            </button>
          </div>
        </div>

        <div className={editorScrollClass}>
          <div>
            <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
              Type
            </label>
            <div
              className="flex flex-wrap gap-1 rounded-2xl border border-[#1e2230] bg-[#0B0F17] p-1"
              role="group"
              aria-label="Type de phase"
            >
              {PHASE_ENTRIES.map(([type, style]) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setPhaseType(type)}
                  className={`min-w-0 flex-1 rounded-xl px-2 py-2 text-center text-[11px] font-bold transition-all sm:min-w-[4.75rem] ${
                    phaseType === type
                      ? "shadow-md"
                      : "text-slate-500 hover:bg-[#121826] hover:text-slate-300"
                  }`}
                  style={
                    phaseType === type
                      ? {
                          background: `${style.color}18`,
                          color: style.color,
                          boxShadow: `inset 0 0 0 1px ${style.color}44`,
                        }
                      : undefined
                  }
                >
                  <span className="block truncate">
                    {style.icon} {style.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
              Temps (min après le début)
            </label>
            <div className="space-y-2 rounded-2xl border border-[#1e2230] bg-[#0B0F17] p-3">
              <input
                type="range"
                min={0}
                max={timeMax}
                step={0.25}
                value={Math.min(minutes, timeMax)}
                onChange={(e) =>
                  setMinutes(parseFloat(e.target.value) || 0)
                }
                className="h-2 w-full cursor-pointer accent-amber-500"
              />
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="number"
                  min={0}
                  max={1440}
                  step={0.25}
                  value={minutes}
                  onChange={(e) => setMinutes(parseFloat(e.target.value) || 0)}
                  className="w-20 rounded-lg border border-[#1e2230] bg-[#121826] px-2 py-1.5 font-mono text-sm text-slate-200 focus:border-amber-500/50 focus:outline-none"
                />
                <span className="text-[10px] text-slate-600">
                  max {timeMax} min · Discord{" "}
                  {formatOffsetLabel(secondsFromMinutes(minutes), locale)}
                </span>
              </div>
            </div>
          </div>

          <div>
            <label
              htmlFor={`pe-title-${phase.id}`}
              className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500"
            >
              Titre Discord
            </label>
            <input
              id={`pe-title-${phase.id}`}
              name="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className={inputClass}
            />
          </div>

          {(
            [
              ["objective", "Objectif", "But à atteindre..."] as const,
              ["action", "Action demandée", "Consigne concrète..."] as const,
              ["nextHint", "Indice phase suivante", "Préparez-vous à..."] as const,
            ] as const
          ).map(([key, label, placeholder]) => (
            <div key={key}>
              <label
                htmlFor={`pe-${key}-${phase.id}`}
                className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500"
              >
                {label}
              </label>
              <textarea
                id={`pe-${key}-${phase.id}`}
                name={key}
                value={
                  key === "objective"
                    ? objective
                    : key === "action"
                      ? action
                      : nextHint
                }
                placeholder={placeholder}
                rows={3}
                onChange={(e) => {
                  if (key === "objective") setObjective(e.target.value);
                  else if (key === "action") setAction(e.target.value);
                  else setNextHint(e.target.value);
                }}
                className={textareaClass}
              />
            </div>
          ))}

          <div className="rounded-xl border border-[#1e2230]/80 bg-[#0B0F17]/40 px-3 py-2">
            <p className="text-[10px] leading-relaxed text-slate-600">
              Terrain — une ligne par entrée (mission flow & live).
              {eventProductKey === "swordland" ? (
                <span className="mt-0.5 block text-amber-500/65">
                  Preset Swordland : enrichit les vues tactiques.
                </span>
              ) : null}
            </p>
          </div>

          <div>
            <label
              htmlFor={`pe-ld-${phase.id}`}
              className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500"
            >
              Leaders assignés
            </label>
            <textarea
              id={`pe-ld-${phase.id}`}
              name="assignedLeaders"
              value={leadersText}
              onChange={(e) => setLeadersText(e.target.value)}
              rows={2}
              className={textareaClass}
            />
          </div>
          <div>
            <label
              htmlFor={`pe-bld-${phase.id}`}
              className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500"
            >
              Bâtiments ciblés
            </label>
            <textarea
              id={`pe-bld-${phase.id}`}
              name="targetedBuildings"
              value={buildingsText}
              onChange={(e) => setBuildingsText(e.target.value)}
              rows={2}
              placeholder={"Bell Tower\nSanctum 1"}
              className={textareaClass}
            />
          </div>
          <div>
            <label
              htmlFor={`pe-pl-${phase.id}`}
              className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500"
            >
              Joueurs assignés
            </label>
            <textarea
              id={`pe-pl-${phase.id}`}
              name="assignedPlayers"
              value={playersText}
              onChange={(e) => setPlayersText(e.target.value)}
              rows={2}
              className={textareaClass}
            />
          </div>

          <div className="rounded-2xl border border-amber-500/25 bg-amber-500/[0.06] p-3">
            <label
              htmlFor={`pe-discord-${phase.id}`}
              className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.12em] text-amber-500/85"
            >
              Override Discord
            </label>
            <p className="mb-2 text-[10px] leading-relaxed text-slate-600">
              Remplace le rendu auto ; sinon l’aperçu gauche suit les champs
              ci-dessus.
            </p>
            <textarea
              id={`pe-discord-${phase.id}`}
              name="customDiscordText"
              value={customDiscord}
              onChange={(e) => setCustomDiscord(e.target.value)}
              rows={3}
              placeholder="Texte Discord personnalisé (optionnel)..."
              className={`${textareaClass} border-amber-500/20 bg-[#0B0F17]`}
            />
          </div>

          <button
            type="button"
            onClick={() => setAdvOpen((o) => !o)}
            className="text-[11px] text-slate-500 hover:text-slate-300"
          >
            {advOpen ? "▼ Masquer avancé" : "▶ Options avancées"}
          </button>
          {advOpen ? (
            <div>
              <p className="mb-2 text-[10px] text-slate-600">
                Clé technique (commandes bot).
              </p>
              <label
                htmlFor={`pe-key-${phase.id}`}
                className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500"
              >
                Clé
              </label>
              <input
                id={`pe-key-${phase.id}`}
                value={keyDraft}
                onChange={(e) => setKeyDraft(e.target.value)}
                autoComplete="off"
                className={inputClass}
              />
            </div>
          ) : null}
        </div>
      </form>

      <div className="flex flex-shrink-0 flex-wrap gap-2 border-t border-[#1e2230] bg-[#0B0F17]/30 px-4 py-2.5 sm:px-5">
        <form action={restorePhaseDiscordDraftAction} className="inline">
          <input type="hidden" name="id" value={phase.id} />
          <input type="hidden" name="templateId" value={templateId} />
          <button
            type="submit"
            className="rounded-lg border border-[#1e2230] px-3 py-1.5 text-[11px] font-medium text-slate-300 hover:bg-[#1e2230] disabled:opacity-40"
            disabled={!phase.generatedDiscordDraft?.trim()}
          >
            Restaurer le brouillon généré
          </button>
        </form>
        <form action={clearPhaseDiscordOverrideAction} className="inline">
          <input type="hidden" name="id" value={phase.id} />
          <input type="hidden" name="templateId" value={templateId} />
          <button
            type="submit"
            className="rounded-lg border border-[#1e2230] px-3 py-1.5 text-[11px] text-slate-500 hover:text-slate-300 disabled:opacity-40"
            disabled={
              !customDiscord.trim() && !phase.customDiscordText?.trim()
            }
          >
            Aperçu auto (champs)
          </button>
        </form>
      </div>
    </div>
  );
}
