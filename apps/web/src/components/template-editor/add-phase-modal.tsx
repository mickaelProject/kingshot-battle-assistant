"use client";

import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import { addPhaseAction } from "@/actions/data";
import { TacticalPhasePreview } from "@/components/tactical-phase-preview";
import type { TimelineScope } from "@/lib/timeline-scope";
import { cn } from "@/lib/utils";

const PHASE_TYPES: { id: string; label: string; hint: string }[] = [
  { id: "START", label: "Lancement", hint: "Ouverture de session" },
  { id: "OBJECTIVE", label: "Objectif", hint: "But à atteindre" },
  { id: "REMINDER", label: "Rappel", hint: "Relance horaire" },
  { id: "FINAL", label: "Clôture", hint: "Fin / synthèse" },
];

function secondsFromMinutes(min: number): number {
  if (!Number.isFinite(min) || min < 0) return 0;
  return Math.round(min * 60);
}

const fieldLabel =
  "mb-1 block text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-500";
const inputBase =
  "w-full rounded-xl border border-[#1e2230] bg-[#0B0F17] px-2.5 py-1.5 text-sm text-slate-200 outline-none transition-shadow placeholder:text-slate-600 focus:border-amber-500/40 focus:ring-1 focus:ring-amber-500/20";
const textareaBase = `${inputBase} resize-none leading-snug`;

export function AddPhaseModal({
  open,
  onClose,
  templateId,
  timelineScope,
}: {
  open: boolean;
  onClose: () => void;
  templateId: string;
  timelineScope: TimelineScope;
}) {
  const titleId = useId();
  const formId = useId();
  const [mounted, setMounted] = useState(false);
  const [mobilePanel, setMobilePanel] = useState<"form" | "preview">("form");
  const [minutes, setMinutes] = useState(0);
  const [phaseType, setPhaseType] = useState("REMINDER");
  const [title, setTitle] = useState("");
  const [objective, setObjective] = useState("");
  const [action, setAction] = useState("");
  const [nextHint, setNextHint] = useState("");

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setMobilePanel("form");
    setMinutes(0);
    setPhaseType("REMINDER");
    setTitle("");
    setObjective("");
    setAction("");
    setNextHint("");
  }, [open]);

  if (!mounted || !open) return null;

  const previewBlock = (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <span className="mb-2 font-rajdhani text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
        Aperçu live
      </span>
      <div className="min-h-0 flex-1 overflow-hidden rounded-xl border border-[#1e2230] bg-[#0B0F17]/80 p-2">
        <div className="h-full origin-top scale-[0.92] transform">
          <TacticalPhasePreview
            phaseType={phaseType}
            title={title || "…"}
            objective={objective}
            action={action}
            nextHint={nextHint}
            customDiscordText={null}
            compact
            showMessageChrome={false}
          />
        </div>
      </div>
    </div>
  );

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4">
      <button
        type="button"
        className="absolute inset-0 bg-[#0B0F17]/85 backdrop-blur-sm"
        aria-label="Fermer la fenêtre"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="template-editor relative z-10 flex max-h-[min(92dvh,680px)] w-full max-w-[920px] flex-col overflow-hidden rounded-2xl border border-[#1e2230] bg-[#121826] shadow-[0_24px_80px_rgba(0,0,0,0.55)] ring-1 ring-amber-500/20"
      >
        <div className="flex flex-shrink-0 items-start justify-between gap-3 border-b border-[#1e2230] px-4 py-3 sm:px-5 sm:py-3.5">
          <div>
            <p
              id={titleId}
              className="font-rajdhani text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-500/85"
            >
              Nouvelle phase
            </p>
            <h2 className="mt-0.5 font-rajdhani text-base font-bold text-slate-100 sm:text-lg">
              Ajouter une étape
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border border-[#1e2230] text-slate-500 transition-colors hover:border-[#2a3042] hover:bg-[#0B0F17] hover:text-slate-200"
            aria-label="Fermer"
          >
            ✕
          </button>
        </div>

        <div
          className="flex min-h-0 flex-1 flex-col overflow-hidden"
          role="presentation"
        >
          <div
            className="flex shrink-0 border-b border-[#1e2230] lg:hidden"
            role="tablist"
            aria-label="Contenu de la modale"
          >
            <button
              type="button"
              role="tab"
              aria-selected={mobilePanel === "form"}
              className={cn(
                "flex-1 py-2.5 text-center text-xs font-bold transition-colors",
                mobilePanel === "form"
                  ? "border-b-2 border-amber-500 text-amber-500"
                  : "text-slate-500",
              )}
              onClick={() => setMobilePanel("form")}
            >
              Étape
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mobilePanel === "preview"}
              className={cn(
                "flex-1 py-2.5 text-center text-xs font-bold transition-colors",
                mobilePanel === "preview"
                  ? "border-b-2 border-amber-500 text-amber-500"
                  : "text-slate-500",
              )}
              onClick={() => setMobilePanel("preview")}
            >
              Aperçu
            </button>
          </div>

          <div className="grid min-h-0 flex-1 overflow-hidden lg:grid-cols-[minmax(0,1fr)_min(300px,34%)]">
            <div
              className={cn(
                "min-h-0 overflow-hidden px-4 py-3 sm:px-5 sm:py-4",
                mobilePanel !== "form" && "hidden lg:block",
              )}
            >
              <form
                id={formId}
                action={addPhaseAction}
                className="flex h-full min-h-0 flex-col gap-2.5 overflow-hidden"
                onSubmit={(e) => {
                  if (!title.trim()) e.preventDefault();
                }}
              >
                <input type="hidden" name="templateId" value={templateId} />
                <input type="hidden" name="timelineScope" value={timelineScope} />
                <input type="hidden" name="key" value="" />
                <input
                  type="hidden"
                  name="offsetSeconds"
                  value={String(secondsFromMinutes(minutes))}
                />
                <input type="hidden" name="phaseType" value={phaseType} />

                <div className="flex flex-wrap items-end gap-3">
                  <div className="w-[7.5rem] shrink-0">
                    <label htmlFor={`${formId}-min`} className={fieldLabel}>
                      T+ (min)
                    </label>
                    <input
                      id={`${formId}-min`}
                      type="number"
                      min={0}
                      step={0.25}
                      value={minutes}
                      onChange={(e) =>
                        setMinutes(parseFloat(e.target.value) || 0)
                      }
                      className={inputBase}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className={fieldLabel}>Type</span>
                    <div className="grid grid-cols-4 gap-1.5">
                      {PHASE_TYPES.map((pt) => (
                        <button
                          key={pt.id}
                          type="button"
                          title={pt.hint}
                          className={cn(
                            "rounded-lg border px-1 py-2 text-center text-[10px] font-bold leading-tight transition-all sm:text-[11px]",
                            phaseType === pt.id
                              ? "border-amber-500/60 bg-amber-500/15 text-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.12)]"
                              : "border-[#1e2230] bg-[#0B0F17] text-slate-500 hover:border-[#2a3042] hover:text-slate-400",
                          )}
                          onClick={() => setPhaseType(pt.id)}
                        >
                          {pt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <label htmlFor={`${formId}-title`} className={fieldLabel}>
                    Titre
                  </label>
                  <input
                    id={`${formId}-title`}
                    name="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                    placeholder="Ex. Focus porte sud"
                    className={inputBase}
                  />
                </div>

                <div className="grid min-h-0 grid-cols-1 gap-2 sm:grid-cols-3">
                  <div className="flex min-h-0 flex-col">
                    <label htmlFor={`${formId}-obj`} className={fieldLabel}>
                      Objectif
                    </label>
                    <textarea
                      id={`${formId}-obj`}
                      name="objective"
                      value={objective}
                      onChange={(e) => setObjective(e.target.value)}
                      rows={2}
                      className={cn(textareaBase, "min-h-[3rem] flex-1")}
                    />
                  </div>
                  <div className="flex min-h-0 flex-col">
                    <label htmlFor={`${formId}-act`} className={fieldLabel}>
                      Action
                    </label>
                    <textarea
                      id={`${formId}-act`}
                      name="action"
                      value={action}
                      onChange={(e) => setAction(e.target.value)}
                      rows={2}
                      className={cn(textareaBase, "min-h-[3rem] flex-1")}
                    />
                  </div>
                  <div className="flex min-h-0 flex-col">
                    <label htmlFor={`${formId}-next`} className={fieldLabel}>
                      Indice suite
                    </label>
                    <textarea
                      id={`${formId}-next`}
                      name="nextHint"
                      value={nextHint}
                      onChange={(e) => setNextHint(e.target.value)}
                      rows={2}
                      className={cn(textareaBase, "min-h-[3rem] flex-1")}
                    />
                  </div>
                </div>
              </form>
            </div>

            <div
              className={cn(
                "flex min-h-0 flex-col overflow-hidden border-t border-[#1e2230] bg-[#0B0F14]/85 px-4 py-3 sm:px-4 sm:py-4 lg:border-l lg:border-t-0",
                mobilePanel !== "preview" && "hidden lg:flex",
              )}
            >
              {previewBlock}
            </div>
          </div>
        </div>

        <div className="flex flex-shrink-0 flex-col-reverse gap-2 border-t border-[#1e2230] bg-[#121826] px-4 py-3 sm:flex-row sm:justify-end sm:px-5 sm:py-3.5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-[#1e2230] px-4 py-2 text-sm font-medium text-slate-400 transition-colors hover:border-[#2a3042] hover:text-slate-200"
          >
            Annuler
          </button>
          <button
            type="submit"
            form={formId}
            className="btn btn-primary rounded-2xl px-5 py-2 text-sm font-bold shadow-[0_0_24px_rgba(245,158,11,0.2)]"
            disabled={!title.trim()}
          >
            Ajouter à la timeline
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
