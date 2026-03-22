"use client";

import type { BattlePhaseType } from "@prisma/client";
import { useTranslations } from "next-intl";
import { getPhaseStyle } from "@/lib/phaseStyles";
import { formatTimelineTLabel } from "@/lib/time-human";

type Ev = {
  offsetSeconds: number;
  phaseType: BattlePhaseType;
  title: string;
};

const MAX_SHOWN = 4;

/**
 * Aperçu compact type schéma pour les cartes liste (axe + nœuds + titres courts).
 */
export function TemplateMiniTimeline({ events }: { events: Ev[] }) {
  const t = useTranslations("templates");

  if (events.length === 0) {
    return (
      <p className="template-mini-tl__empty muted m-0 text-[13px]">
        {t("miniNoPhases")}
      </p>
    );
  }

  const sorted = [...events].sort((a, b) => a.offsetSeconds - b.offsetSeconds);
  const n = sorted.length;
  const columns = sorted.slice(0, MAX_SHOWN);
  const moreCount = n > MAX_SHOWN ? n - MAX_SHOWN : 0;
  const colCount = columns.length;

  return (
    <div
      className="template-mini-tl relative"
      aria-label={t("miniAria", { count: n })}
    >
      <div className="relative flex min-h-[108px] flex-col justify-end px-0.5 pt-7 pb-0.5">
        <div
          className="pointer-events-none absolute left-[8%] right-[8%] top-[22px] z-0 h-[3px] rounded-full bg-gradient-to-r from-emerald-400/90 via-sky-500/80 via-amber-400/70 to-red-500/90 opacity-[0.92] shadow-[0_0_14px_rgba(56,189,248,0.2)]"
          style={{
            left: `calc(100% / (${2 * Math.max(colCount, 1)}))`,
            right: `calc(100% / (${2 * Math.max(colCount, 1)}))`,
          }}
          aria-hidden
        />

        <div className="relative z-10 flex w-full items-start justify-center gap-0">
          {columns.map((ev, i) => {
            const st = getPhaseStyle(ev.phaseType);
            const label = formatTimelineTLabel(ev.offsetSeconds);
            return (
              <div
                key={`${ev.offsetSeconds}-${i}`}
                className="flex min-w-0 flex-1 flex-col items-center px-0.5"
              >
                <div
                  className="flex h-9 w-full flex-col items-center justify-start"
                  title={`${label} · ${ev.title}`}
                >
                  <div
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 bg-[#0c0e14] ring-1 ring-black/40"
                    style={{
                      borderColor: st.color,
                      boxShadow: `0 0 12px ${st.color}44`,
                    }}
                  >
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ background: st.color }}
                      aria-hidden
                    />
                  </div>
                  <div
                    className="mt-0.5 h-2 w-px shrink-0 bg-gradient-to-b from-slate-500/40 to-transparent"
                    aria-hidden
                  />
                </div>
                <div className="mt-1 w-full text-center">
                  <div className="font-mono text-[10px] font-bold tabular-nums text-amber-500/95">
                    {label}
                  </div>
                  <p className="mt-0.5 line-clamp-2 text-center text-[11px] font-medium leading-snug text-slate-400">
                    {ev.title?.trim() || "—"}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {moreCount > 0 ? (
          <p className="mb-0 mt-1.5 text-center text-[11px] font-medium text-slate-500">
            {moreCount === 1
              ? t("miniMoreOne")
              : t("miniMoreOther", { count: moreCount })}
          </p>
        ) : null}
      </div>
    </div>
  );
}
