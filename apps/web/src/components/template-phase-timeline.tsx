"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { deletePhaseAction, reorderTemplatePhasesAction } from "@/actions/data";
import { TacticalPhasePreview } from "@/components/tactical-phase-preview";
import type { EditorPhase } from "@/lib/editor-phase";
import { TACTICAL_PHASE_UI } from "@/lib/tactical-preview";
import { formatOffsetLabel } from "@/lib/time-human";
import { useRouter } from "next/navigation";

const PHASE_LABELS: Record<string, string> = {
  START: "Lancement",
  OBJECTIVE: "Objectif",
  REMINDER: "Rappel",
  FINAL: "Clôture",
};

function previewSnippet(text: string, max = 140): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (!t) return "";
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

function phaseAccent(phaseType: string): { color: string; ribbon: string } {
  const u = TACTICAL_PHASE_UI[phaseType] ?? TACTICAL_PHASE_UI.REMINDER;
  return { color: u.color, ribbon: u.ribbon };
}

export function TemplatePhaseTimeline({
  phases,
  templateId,
  selectedId,
  onSelectPhase,
}: {
  phases: EditorPhase[];
  templateId: string;
  selectedId: string | null;
  onSelectPhase: (id: string) => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dropHint, setDropHint] = useState<{
    targetId: string;
    before: boolean;
  } | null>(null);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sorted = useMemo(
    () =>
      [...phases].sort(
        (a, b) =>
          a.offsetSeconds - b.offsetSeconds || a.key.localeCompare(b.key),
      ),
    [phases],
  );

  const submitReorder = useCallback(
    (orderedIds: string[]) => {
      const fd = new FormData();
      fd.set("templateId", templateId);
      for (const id of orderedIds) {
        fd.append("phaseId", id);
      }
      startTransition(async () => {
        const r = await reorderTemplatePhasesAction(fd);
        if (r.ok) router.refresh();
      });
    },
    [router, templateId],
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

  const onDragStart = (e: React.DragEvent, id: string) => {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", id);
  };

  const onDragEnd = () => {
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
    submitReorder(next);
  };

  const openHoverPreview = (id: string) => {
    clearTimers();
    hoverTimer.current = setTimeout(() => setHoverId(id), 200);
  };

  const scheduleClosePreview = () => {
    if (hoverTimer.current) {
      clearTimeout(hoverTimer.current);
      hoverTimer.current = null;
    }
    leaveTimer.current = setTimeout(() => setHoverId(null), 180);
  };

  if (sorted.length === 0) {
    return (
      <p className="template-timeline__empty muted">
        Aucune phase pour l’instant — ajoute-en une plus bas.
      </p>
    );
  }

  return (
    <div className="template-timeline">
      <p className="template-timeline__hint muted">
        <strong>Glisser</strong> la poignée pour réordonner les annonces.{" "}
        <strong>Survol</strong> : aperçu Discord · <strong>Clic</strong> : modifier
        l’étape.
      </p>
      <ul className="template-timeline__list" role="list">
        {sorted.map((p, index) => {
          const accent = phaseAccent(p.phaseType);
          const isActive = selectedId === p.id;
          const isDragging = draggedId === p.id;
          const dropBefore =
            dropHint?.targetId === p.id && dropHint.before && !isDragging;
          const dropAfter =
            dropHint?.targetId === p.id && !dropHint.before && !isDragging;

          return (
            <li
              key={p.id}
              className={[
                "template-timeline__row",
                isDragging ? "template-timeline__row--dragging" : "",
                dropBefore ? "template-timeline__row--drop-before" : "",
                dropAfter ? "template-timeline__row--drop-after" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              onDragOver={(e) => onDragOverRow(e, p.id)}
              onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                  setDropHint(null);
                }
              }}
              onDrop={(e) => onDropRow(e, p.id)}
            >
              <div
                className="template-timeline__rail"
                aria-hidden
                style={{ "--phase-accent": accent.color } as React.CSSProperties}
              >
                <span className="template-timeline__dot" />
                {index < sorted.length - 1 ? (
                  <span className="template-timeline__stem" />
                ) : null}
              </div>
              <div
                className="template-timeline__card-wrap"
                onMouseEnter={() => openHoverPreview(p.id)}
                onMouseLeave={scheduleClosePreview}
              >
                <div
                  className={`template-timeline__card ${isActive ? "template-timeline__card--active" : ""}`}
                  style={
                    {
                      "--phase-accent": accent.color,
                    } as React.CSSProperties
                  }
                >
                  <button
                    type="button"
                    className="template-timeline__grip"
                    draggable
                    onDragStart={(e) => onDragStart(e, p.id)}
                    onDragEnd={onDragEnd}
                    aria-label="Glisser pour réordonner"
                    title="Réordonner"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <span className="template-timeline__grip-bars" aria-hidden />
                  </button>
                  <button
                    type="button"
                    className="template-timeline__main"
                    onClick={() => onSelectPhase(p.id)}
                  >
                    <div className="template-timeline__meta">
                      <span
                        className="template-timeline__time"
                        style={{ color: accent.color }}
                      >
                        {formatOffsetLabel(p.offsetSeconds)}
                      </span>
                      <span
                        className="template-timeline__type-pill"
                        style={{
                          background: `${accent.color}22`,
                          color: accent.color,
                          borderColor: `${accent.color}44`,
                        }}
                      >
                        <span aria-hidden>{accent.ribbon}</span>
                        {PHASE_LABELS[p.phaseType] ?? p.phaseType}
                      </span>
                    </div>
                    <span className="template-timeline__title">{p.title}</span>
                    <span className="template-timeline__preview muted">
                      {previewSnippet(p.action || p.objective) ||
                        "— Aucune action renseignée"}
                    </span>
                  </button>
                  <form
                    action={deletePhaseAction}
                    className="template-timeline__delete-form"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input type="hidden" name="id" value={p.id} />
                    <input type="hidden" name="templateId" value={templateId} />
                    <button
                      type="submit"
                      className="template-timeline__delete"
                      title="Supprimer la phase"
                      aria-label="Supprimer"
                    >
                      ×
                    </button>
                  </form>
                </div>

                {hoverId === p.id ? (
                  <div className="template-timeline__popover">
                    <TacticalPhasePreview
                      phaseType={p.phaseType}
                      title={p.title}
                      objective={p.objective}
                      action={p.action}
                      nextHint={p.nextHint}
                      compact
                      showMessageChrome={false}
                    />
                  </div>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
      {isPending ? (
        <p className="template-timeline__pending muted">Mise à jour…</p>
      ) : null}
    </div>
  );
}
