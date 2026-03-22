"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { EditorPhase } from "@/lib/editor-phase";
import { getPhaseStyle } from "@/lib/phaseStyles";
import { cn } from "@/lib/utils";

function offsetMinLabel(sec: number): string {
  const m = sec / 60;
  if (m === 0) return "0";
  return Number.isInteger(m) ? String(m) : m.toFixed(2).replace(/\.?0+$/, "");
}

export function DiscordPreview({
  phases,
  durationMinutes,
  highlightPhaseId,
  className,
  layoutMode = "all",
  onPhaseChange,
}: {
  phases: EditorPhase[];
  durationMinutes: number;
  highlightPhaseId: string | null;
  className?: string;
  /** `focused` : un seul message (colonne éditeur à côté). */
  layoutMode?: "all" | "focused";
  /** Synchronise la phase affichée avec le parent (ex. Préc./Suiv. → édition). */
  onPhaseChange?: (phaseId: string) => void;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    if (phases.length === 0) {
      setActiveIndex(0);
      return;
    }
    if (highlightPhaseId == null) {
      setActiveIndex(0);
      return;
    }
    const idx = phases.findIndex((p) => p.id === highlightPhaseId);
    if (idx >= 0) setActiveIndex(idx);
  }, [highlightPhaseId, phases]);

  const safeIndex =
    phases.length === 0 ? 0 : Math.min(activeIndex, phases.length - 1);

  useEffect(() => {
    const refIdx = layoutMode === "focused" ? 0 : safeIndex;
    itemRefs.current[refIdx]?.scrollIntoView({
      block: "center",
      behavior: "smooth",
    });
  }, [safeIndex, highlightPhaseId, layoutMode]);

  const onPrev = useCallback(() => {
    setActiveIndex((i) => {
      const next = Math.max(0, i - 1);
      const p = phases[next];
      if (p) onPhaseChange?.(p.id);
      return next;
    });
  }, [phases, onPhaseChange]);

  const onNext = useCallback(() => {
    setActiveIndex((i) => {
      const next = Math.min(phases.length - 1, i + 1);
      const p = phases[next];
      if (p) onPhaseChange?.(p.id);
      return next;
    });
  }, [phases, onPhaseChange]);

  return (
    <div
      className={cn(
        "flex h-full min-h-0 flex-col rounded-xl border border-[#1e2230] bg-[#111318]",
        className,
      )}
    >
      <div className="flex flex-shrink-0 items-center justify-between border-b border-[#1e2230] bg-[#0d0f14] px-4 py-3">
        <div className="flex items-center gap-2">
          <div
            className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-400"
            aria-hidden
          />
          <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-600">
            Aperçu Discord
          </span>
        </div>
        <span className="rounded-full border border-green-500/20 bg-green-500/10 px-2 py-0.5 text-[10px] font-medium text-green-400">
          Live preview
        </span>
      </div>

      <div
        className="min-h-0 flex-1 overflow-y-auto p-3"
        style={{ background: "#313338" }}
      >
        {phases.length === 0 ? (
          <p className="text-center text-sm text-[#87898c]">
            Aucune phase sur cette timeline.
          </p>
        ) : layoutMode === "focused" && highlightPhaseId == null ? (
          <p className="px-2 py-8 text-center text-sm leading-relaxed text-[#87898c]">
            Choisissez une phase dans l’onglet{" "}
            <span className="text-[#b5bac1]">Mission flow</span> pour afficher
            l’aperçu Discord et l’édition ici.
          </p>
        ) : (
          (layoutMode === "focused"
            ? phases[safeIndex]
              ? [phases[safeIndex]!]
              : []
            : phases
          ).map((phase, displayIdx) => {
            const idx =
              layoutMode === "focused" ? safeIndex : displayIdx;
            const style = getPhaseStyle(phase.phaseType);
            const content = phase.customDiscordText?.trim()
              ? phase.customDiscordText
              : null;
            const isHi =
              highlightPhaseId === phase.id ||
              (!highlightPhaseId && idx === safeIndex);

            return (
              <div
                key={phase.id}
                ref={(el) => {
                  itemRefs.current[layoutMode === "focused" ? 0 : displayIdx] =
                    el;
                }}
                className={cn(
                  "mb-4 flex gap-3 rounded-md transition-all duration-300 ease-out will-change-transform",
                  isHi
                    ? "relative z-[1] scale-[1.02] opacity-100 shadow-[0_8px_28px_rgba(0,0,0,0.45)] ring-2 ring-amber-400/45 ring-offset-2 ring-offset-[#313338]"
                    : "scale-100 opacity-[0.88]",
                )}
              >
                <div
                  className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                  style={{ background: "#5865f2" }}
                >
                  KB
                </div>

                <div className="min-w-0 flex-1">
                  <div className="mb-1.5 flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-white">
                      Kingshot Battle Assistant
                    </span>
                    <span
                      className="rounded px-1.5 py-0.5 text-[10px] font-semibold text-white"
                      style={{ background: "#5865f2" }}
                    >
                      APP
                    </span>
                    <span className="text-xs" style={{ color: "#87898c" }}>
                      T+{offsetMinLabel(phase.offsetSeconds)} min
                    </span>
                  </div>

                  <div
                    className="overflow-hidden rounded"
                    style={{
                      background: "#2b2d31",
                      borderLeft: `4px solid ${style.color}`,
                    }}
                  >
                    <div className="p-3">
                      <div
                        className="mb-2 flex items-center gap-1.5 text-xs font-bold tracking-wider"
                        style={{ color: style.color }}
                      >
                        {style.icon} {style.label}
                      </div>

                      <div
                        className="mb-2 text-[15px] font-bold leading-tight"
                        style={{ color: "#f2f3f5" }}
                      >
                        {phase.title}
                      </div>

                      {content ? (
                        <div
                          className="whitespace-pre-wrap text-sm leading-relaxed"
                          style={{ color: "#dbdee1" }}
                        >
                          {content}
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {phase.objective ? (
                            <div>
                              <div
                                className="mb-0.5 text-xs font-semibold"
                                style={{ color: "#b5bac1" }}
                              >
                                Objectif
                              </div>
                              <div
                                className="whitespace-pre-wrap text-sm"
                                style={{ color: "#dbdee1" }}
                              >
                                {phase.objective}
                              </div>
                            </div>
                          ) : null}
                          {phase.action ? (
                            <div>
                              <div
                                className="mb-0.5 text-xs font-semibold"
                                style={{ color: "#b5bac1" }}
                              >
                                Action demandée
                              </div>
                              <div className="text-sm" style={{ color: "#dbdee1" }}>
                                {phase.action}
                              </div>
                            </div>
                          ) : null}
                          {phase.nextHint ? (
                            <div
                              className="mt-2 border-t pt-2"
                              style={{ borderColor: "#3f4147" }}
                            >
                              <div
                                className="text-xs italic"
                                style={{ color: "#87898c" }}
                              >
                                → {phase.nextHint}
                              </div>
                            </div>
                          ) : null}
                        </div>
                      )}

                      <div
                        className="mt-2 border-t pt-2 text-[10px]"
                        style={{ color: "#4e5058", borderColor: "#3f4147" }}
                      >
                        Kingshot Battle Assistant · {durationMinutes} min
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="flex flex-shrink-0 items-center justify-between border-t border-[#1e2230] bg-[#0d0f14] px-4 py-2.5">
        <button
          type="button"
          onClick={onPrev}
          disabled={
            safeIndex === 0 ||
            phases.length === 0 ||
            (layoutMode === "focused" && highlightPhaseId == null)
          }
          className="flex items-center gap-1 text-xs text-slate-500 transition-colors hover:text-slate-300 disabled:opacity-30"
        >
          ← Préc.
        </button>
        <span className="font-mono text-[11px] text-slate-600">
          {phases.length === 0 || (layoutMode === "focused" && highlightPhaseId == null)
            ? "—"
            : `${safeIndex + 1} / ${phases.length}`}
        </span>
        <button
          type="button"
          onClick={onNext}
          disabled={
            phases.length === 0 ||
            safeIndex >= phases.length - 1 ||
            (layoutMode === "focused" && highlightPhaseId == null)
          }
          className="flex items-center gap-1 text-xs text-slate-500 transition-colors hover:text-slate-300 disabled:opacity-30"
        >
          Suiv. →
        </button>
      </div>
    </div>
  );
}
