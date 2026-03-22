import { getPhaseStyle } from "@/lib/phaseStyles";
import { formatTimelineTLabel } from "@/lib/time-human";
import { cn } from "@/lib/utils";

type Phase = {
  id: string;
  offsetSeconds: number;
  phaseType: string;
  key: string;
  title: string;
};

/**
 * Frise chronologique lecture seule : schéma horizontal (axe + nœuds + cartes).
 */
export function PhaseTimeline({ phases }: { phases: Phase[] }) {
  if (phases.length === 0) return null;

  const n = phases.length;

  return (
    <div
      className="phase-timeline-frieze -mx-1"
      aria-label="Frise chronologique des phases"
      role="list"
    >
      <div className="overflow-x-auto overflow-y-visible pb-3 pt-1 [scrollbar-width:thin] [scrollbar-color:rgba(55,65,81,0.8)_transparent]">
        <div className="relative mx-auto flex min-w-min justify-center px-3">
          {/* Axe principal type schéma / pipeline */}
          <div
            className="pointer-events-none absolute top-[26px] z-0 h-[3px] rounded-full bg-gradient-to-r from-emerald-400/95 via-sky-500/85 via-amber-400/75 to-red-500/95 opacity-90 shadow-[0_0_20px_rgba(56,189,248,0.25)]"
            aria-hidden
            style={{
              left: `calc(100% / (${2 * n}))`,
              right: `calc(100% / (${2 * n}))`,
            }}
          />

          <div className="relative z-10 flex flex-nowrap gap-0">
            {phases.map((p, index) => {
              const st = getPhaseStyle(p.phaseType);
              return (
                <div
                  key={p.id}
                  role="listitem"
                  className="flex w-[min(100vw-2rem,168px)] shrink-0 flex-col items-center px-1.5 sm:w-[156px] sm:px-2"
                >
                  {/* Nœud sur l’axe */}
                  <div className="relative flex h-12 w-full flex-col items-center justify-start">
                    <div
                      className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-full border-2 bg-[#0B0F17] ring-2 ring-[#121826] transition-transform duration-200 hover:scale-110"
                      style={{
                        borderColor: st.color,
                        boxShadow: `0 0 16px ${st.color}55, inset 0 0 8px ${st.color}18`,
                      }}
                      title={`${p.key}`}
                    >
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ background: st.color }}
                        aria-hidden
                      />
                    </div>
                    {/* petit repère « tique » vers la carte */}
                    <div
                      className="mt-0.5 h-2 w-px bg-gradient-to-b from-slate-500/50 to-transparent"
                      aria-hidden
                    />
                  </div>

                  {/* Bloc schéma (carte) */}
                  <article
                    title={`${p.key} — ${p.title || "Phase"}`}
                    className={cn(
                      "w-full rounded-xl border border-[#1e2230] bg-[#0B0F17] px-2.5 py-2 shadow-md ring-1 ring-white/[0.04] transition-shadow hover:ring-amber-500/20",
                    )}
                  >
                    <div
                      className="mb-1 flex items-center justify-between gap-1 border-b border-[#1e2230]/80 pb-1"
                    >
                      <span className="font-mono text-[10px] font-semibold text-amber-500/90">
                        {formatTimelineTLabel(p.offsetSeconds)}
                      </span>
                      <span
                        className="max-w-[5rem] truncate text-[9px] font-bold uppercase tracking-wide"
                        style={{ color: st.color }}
                      >
                        {st.icon} {st.label}
                      </span>
                    </div>
                    <p className="line-clamp-3 min-h-[2.75rem] text-[11px] font-semibold leading-snug text-slate-100">
                      {p.title.trim() || "—"}
                    </p>
                    <div className="mt-1.5 flex items-center justify-between border-t border-dashed border-[#1e2230]/60 pt-1">
                      <span className="text-[9px] font-mono text-slate-600">
                        Étape {index + 1}/{n}
                      </span>
                      {index < n - 1 ? (
                        <span
                          className="text-[10px] font-bold text-slate-600"
                          aria-hidden
                        >
                          →
                        </span>
                      ) : (
                        <span className="text-[9px] text-emerald-500/70">Fin</span>
                      )}
                    </div>
                  </article>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <p className="mt-1 text-center text-[10px] text-slate-600">
        Faire défiler horizontalement sur petit écran — flux du début à la clôture.
      </p>
    </div>
  );
}
