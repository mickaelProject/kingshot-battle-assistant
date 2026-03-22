"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { deletePhaseAction, reorderTemplatePhasesAction } from "@/actions/data";
import type { EditorPhase } from "@/lib/editor-phase";
import { getPhaseStyle } from "@/lib/phaseStyles";
import { formatTimelineTLabel } from "@/lib/time-human";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

function oneLine(text: string, max = 96): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (!t) return "";
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

function joinList(items: string[], max = 3): string {
  if (items.length === 0) return "";
  const shown = items.slice(0, max).join(" · ");
  if (items.length > max) return `${shown} +${items.length - max}`;
  return shown;
}

function sortPhases(a: EditorPhase, b: EditorPhase): number {
  return (
    a.offsetSeconds - b.offsetSeconds ||
    a.orderIndex - b.orderIndex ||
    a.key.localeCompare(b.key)
  );
}

function GripIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="text-slate-600"
      aria-hidden
    >
      <circle cx="9" cy="6" r="1.5" />
      <circle cx="15" cy="6" r="1.5" />
      <circle cx="9" cy="12" r="1.5" />
      <circle cx="15" cy="12" r="1.5" />
      <circle cx="9" cy="18" r="1.5" />
      <circle cx="15" cy="18" r="1.5" />
    </svg>
  );
}

export function TemplateMissionFlow({
  phases,
  templateId,
  timelineScope,
  selectedId,
  onSelectPhase,
  onHoverPhase,
  eventDurationMinutes,
  legionAllianceOffsetMinutes = 0,
}: {
  phases: EditorPhase[];
  templateId: string;
  timelineScope: string;
  selectedId: string | null;
  onSelectPhase: (id: string) => void;
  onHoverPhase?: (id: string | null) => void;
  eventDurationMinutes: number;
  /** Minutes après le T+0 alliance où commence le T+0 de cette timeline légion. */
  legionAllianceOffsetMinutes?: number;
}) {
  const router = useRouter();
  const [isReordering, setIsReordering] = useState(false);
  /** Évite clic / submit « fantôme » juste après un drag (souvent sur ×). */
  const blockPointerActionsUntil = useRef(0);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dropHint, setDropHint] = useState<{
    targetId: string;
    before: boolean;
  } | null>(null);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const itemRefs = useRef<Map<string, HTMLLIElement>>(new Map());

  const sorted = useMemo(() => [...phases].sort(sortPhases), [phases]);

  const submitReorder = useCallback(
    async (orderedIds: string[]) => {
      const fd = new FormData();
      fd.set("templateId", templateId);
      fd.set("timelineScope", timelineScope);
      for (const id of orderedIds) {
        fd.append("phaseId", id);
      }
      setIsReordering(true);
      try {
        const r = await reorderTemplatePhasesAction(fd);
        if (r && typeof r === "object" && "ok" in r && r.ok) {
          router.refresh();
        }
      } catch (err) {
        console.error("[TemplateMissionFlow] reorder", err);
      } finally {
        setIsReordering(false);
      }
    },
    [router, templateId, timelineScope],
  );

  const clearTimers = () => {
    if (hoverTimer.current) {
      clearTimeout(hoverTimer.current);
      hoverTimer.current = null;
    }
    if (leaveTimer.current) {
      clearTimeout(leaveTimer.current);
      leaveTimer.current = null;
    }
  };

  useEffect(() => () => clearTimers(), []);

  useEffect(() => {
    if (!selectedId) return;
    const el = itemRefs.current.get(selectedId);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [selectedId, sorted]);

  const onDragStart = (e: React.DragEvent, id: string) => {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", id);
  };

  const onDragEnd = () => {
    blockPointerActionsUntil.current = Date.now() + 450;
    setDraggedId(null);
    setDropHint(null);
  };

  const onDragOverRow = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (!draggedId || draggedId === targetId) {
      setDropHint(null);
      return;
    }
    const el = e.currentTarget as HTMLElement;
    const rect = el.getBoundingClientRect();
    const before = e.clientY < rect.top + rect.height / 2;
    setDropHint({ targetId, before });
  };

  const onDropRow = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain") || draggedId;
    if (!id) {
      onDragEnd();
      return;
    }
    const ids = sorted.map((p) => p.id);
    const from = ids.indexOf(id);
    const to = ids.indexOf(targetId);
    if (from < 0 || to < 0) {
      onDragEnd();
      return;
    }
    const el = e.currentTarget as HTMLElement;
    const rect = el.getBoundingClientRect();
    const before = e.clientY < rect.top + rect.height / 2;

    const next = [...ids];
    next.splice(from, 1);
    let insertAt = before ? to : to + 1;
    if (from < insertAt) insertAt -= 1;
    insertAt = Math.max(0, Math.min(insertAt, next.length));
    next.splice(insertAt, 0, id);

    onDragEnd();
    void submitReorder(next);
  };

  const openHover = (id: string) => {
    clearTimers();
    hoverTimer.current = setTimeout(() => onHoverPhase?.(id), 160);
  };

  const closeHover = () => {
    if (hoverTimer.current) {
      clearTimeout(hoverTimer.current);
      hoverTimer.current = null;
    }
    leaveTimer.current = setTimeout(() => onHoverPhase?.(null), 160);
  };

  if (sorted.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[#2a3042] bg-[#121826]/80 p-12 text-center">
        <p className="font-rajdhani text-sm font-semibold uppercase tracking-widest text-slate-500">
          Mission flow vide
        </p>
        <p className="mt-2 text-sm text-slate-600">
          Ajoutez une première phase avec le bouton « + Ajouter une phase » ou le
          bouton flottant « + ».
        </p>
      </div>
    );
  }

  return (
    <div className="relative min-h-[320px]">
      <div
        className="pointer-events-none absolute bottom-8 left-[22px] top-8 w-px bg-gradient-to-b from-emerald-500/70 via-sky-500/50 to-red-500/70 opacity-80 shadow-[0_0_12px_rgba(56,189,248,0.35)]"
        aria-hidden
      />

      <ul className="relative list-none space-y-0 p-0 pl-1" role="list">
        {sorted.map((p, index) => {
          const st = getPhaseStyle(p.phaseType);
          const allianceSecs =
            legionAllianceOffsetMinutes > 0
              ? legionAllianceOffsetMinutes * 60 + p.offsetSeconds
              : null;
          const isSelected = selectedId === p.id;
          const isDragging = draggedId === p.id;
          const dropBefore =
            dropHint?.targetId === p.id && dropHint.before && !isDragging;
          const dropAfter =
            dropHint?.targetId === p.id && !dropHint.before && !isDragging;

          const leaders = joinList(p.assignedLeaders, 4);
          const buildings = joinList(p.targetedBuildings, 4);

          return (
            <li
              key={p.id}
              ref={(el) => {
                if (el) itemRefs.current.set(p.id, el);
                else itemRefs.current.delete(p.id);
              }}
              className={cn(
                "relative mb-4 pl-12",
                dropBefore &&
                  "before:absolute before:left-0 before:right-0 before:top-0 before:z-20 before:h-1 before:rounded-full before:bg-amber-500/80",
                dropAfter &&
                  "after:absolute after:bottom-0 after:left-0 after:right-0 after:z-20 after:h-1 after:rounded-full after:bg-amber-500/80",
              )}
              onDragOver={(e) => onDragOverRow(e, p.id)}
              onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                  setDropHint(null);
                }
              }}
              onDrop={(e) => onDropRow(e, p.id)}
            >
              <div className="absolute left-0 top-5 z-10 flex w-11 flex-col items-center">
                <div
                  className={cn(
                    "flex h-5 w-5 items-center justify-center rounded-full border-2 bg-[#0B0F17] transition-transform duration-200",
                    isSelected && "scale-125",
                  )}
                  style={{
                    borderColor: st.color,
                    color: st.color,
                    boxShadow: isSelected
                      ? `0 0 20px ${st.color}77, 0 0 6px ${st.color}44`
                      : undefined,
                  }}
                >
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ background: st.color }}
                  />
                </div>
                {index < sorted.length - 1 ? (
                  <span
                    className="mt-1 font-mono text-[8px] text-slate-700"
                    aria-hidden
                  >
                    │
                  </span>
                ) : null}
              </div>

              <article
                className={cn(
                  "group relative cursor-pointer overflow-hidden rounded-2xl border bg-[#121826] shadow-lg transition-all duration-200",
                  "hover:-translate-y-0.5 hover:border-[#2a3042] hover:shadow-xl hover:shadow-black/40",
                  isSelected
                    ? "border-amber-500/55 shadow-amber-glow-sm animate-mission-card"
                    : "border-[#1e2230]",
                  isDragging && "opacity-40",
                )}
                onClick={(e) => {
                  if (Date.now() < blockPointerActionsUntil.current) {
                    e.preventDefault();
                    e.stopPropagation();
                    return;
                  }
                  onSelectPhase(p.id);
                }}
                onMouseEnter={() => openHover(p.id)}
                onMouseLeave={closeHover}
                onKeyDown={(e) => {
                  if (Date.now() < blockPointerActionsUntil.current) return;
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelectPhase(p.id);
                  }
                }}
                role="button"
                tabIndex={0}
                aria-pressed={isSelected}
              >
                <div
                  className="absolute left-0 top-0 h-full w-1 rounded-l-2xl"
                  style={{
                    background: `linear-gradient(180deg, ${st.color}, ${st.color}88)`,
                  }}
                  aria-hidden
                />

                <div className="relative pl-4 pr-3 py-4">
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <span
                      className="rounded-md px-2 py-0.5 font-rajdhani text-[10px] font-bold tracking-wider"
                      style={{
                        background: `${st.color}22`,
                        color: st.color,
                      }}
                    >
                      {st.icon} {st.label}
                    </span>
                    <span className="font-mono text-[11px] font-semibold text-amber-500/90">
                      {formatTimelineTLabel(p.offsetSeconds)}
                    </span>
                    {allianceSecs != null ? (
                      <span className="font-mono text-[10px] font-medium text-sky-400/85">
                        · alliance {formatTimelineTLabel(allianceSecs)}
                      </span>
                    ) : null}
                    <span className="text-[10px] text-slate-600">
                      · événement {eventDurationMinutes} min
                    </span>
                    <div className="ml-auto flex items-center gap-1">
                      <form
                        action={deletePhaseAction}
                        onClick={(e) => e.stopPropagation()}
                        onSubmit={(e) => {
                          if (Date.now() < blockPointerActionsUntil.current) {
                            e.preventDefault();
                          }
                        }}
                      >
                        <input type="hidden" name="id" value={p.id} />
                        <input
                          type="hidden"
                          name="templateId"
                          value={templateId}
                        />
                        <button
                          type="submit"
                          className="rounded-md px-2 py-1 text-sm text-slate-600 hover:bg-red-500/10 hover:text-red-400"
                          title="Supprimer"
                          aria-label="Supprimer la phase"
                        >
                          ×
                        </button>
                      </form>
                      <button
                        type="button"
                        draggable
                        className="rounded-md p-1.5 opacity-0 transition-opacity hover:bg-[#1e2230] group-hover:opacity-100"
                        onDragStart={(e) => onDragStart(e, p.id)}
                        onDragEnd={onDragEnd}
                        aria-label="Réordonner"
                        title="Glisser pour réordonner"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <GripIcon />
                      </button>
                    </div>
                  </div>

                  <h3 className="mb-2 font-rajdhani text-lg font-semibold leading-snug tracking-tight text-slate-100">
                    {p.title}
                  </h3>
                  <p className="mb-3 line-clamp-1 text-sm text-slate-500">
                    {oneLine(p.objective) || "— Aucun objectif défini"}
                  </p>
                  <div className="grid gap-2 text-xs sm:grid-cols-2">
                    <div className="rounded-lg border border-[#1e2230] bg-[#0B0F17]/80 px-2.5 py-2">
                      <span className="block text-[9px] font-semibold uppercase tracking-wider text-slate-600">
                        Leaders
                      </span>
                      <span className="text-slate-400">
                        {leaders || "—"}
                      </span>
                    </div>
                    <div className="rounded-lg border border-[#1e2230] bg-[#0B0F17]/80 px-2.5 py-2">
                      <span className="block text-[9px] font-semibold uppercase tracking-wider text-slate-600">
                        Bâtiments
                      </span>
                      <span className="text-slate-400">
                        {buildings || "—"}
                      </span>
                    </div>
                  </div>
                </div>
              </article>
            </li>
          );
        })}
      </ul>
      {isReordering ? (
        <p className="mt-2 text-center text-sm text-slate-600">
          Mise à jour de l’ordre…
        </p>
      ) : null}
    </div>
  );
}
