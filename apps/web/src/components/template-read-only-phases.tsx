import { TacticalPhasePreview } from "@/components/tactical-phase-preview";
import { getPhaseStyle } from "@/lib/phaseStyles";
import { formatTimelineTLabel } from "@/lib/time-human";
import { cn } from "@/lib/utils";

export type ReadOnlyTemplateEvent = {
  id: string;
  offsetSeconds: number;
  phaseType: string;
  key: string;
  title: string;
  objective: string;
  action: string;
  nextHint: string;
  customDiscordText: string | null;
};

function oneLine(text: string, max = 100): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (!t) return "";
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

/** Phases en lecture seule : mini-cartes + aperçu Discord repliable. */
export function TemplateReadOnlyPhaseCards({
  events,
}: {
  events: ReadOnlyTemplateEvent[];
}) {
  if (events.length === 0) return null;

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {events.map((ev) => {
        const st = getPhaseStyle(ev.phaseType);
        const hint = oneLine(ev.objective) || oneLine(ev.action) || "—";

        return (
          <details
            key={ev.id}
            className={cn(
              "group rounded-2xl border border-[#1e2230] bg-[#121826] shadow-lg shadow-black/20 ring-1 ring-white/[0.04] transition-[box-shadow] open:ring-amber-500/20",
              "[&_summary::-webkit-details-marker]:hidden",
            )}
          >
            <summary className="cursor-pointer list-none select-none px-3 py-2.5 sm:px-3.5 sm:py-3">
              <div className="flex items-start justify-between gap-2">
                <div
                  className="mt-0.5 h-8 w-1 shrink-0 rounded-full"
                  style={{ background: st.color }}
                  aria-hidden
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-mono text-[10px] font-semibold text-amber-500/90">
                      {formatTimelineTLabel(ev.offsetSeconds)}
                    </span>
                    <span
                      className="rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider"
                      style={{
                        background: `${st.color}22`,
                        color: st.color,
                      }}
                    >
                      {st.label}
                    </span>
                  </div>
                  <h3 className="mt-1 line-clamp-2 text-sm font-semibold leading-snug text-slate-100">
                    {ev.title.trim() || "—"}
                  </h3>
                  <p className="mt-0.5 line-clamp-1 text-[11px] text-slate-500">
                    {hint}
                  </p>
                  <p className="mt-2 text-[10px] font-medium text-amber-500/85 group-open:hidden">
                    ▸ Aperçu Discord — cliquer pour afficher
                  </p>
                  <p className="mt-2 hidden text-[10px] font-medium text-slate-500 group-open:block">
                    ▾ Masquer l’aperçu
                  </p>
                </div>
              </div>
            </summary>
            <div className="border-t border-[#1e2230] bg-[#0B0F17]/90 px-3 py-3">
              <p className="mb-2 font-mono text-[9px] text-slate-600" title={ev.key}>
                Clé : {ev.key.length > 28 ? `${ev.key.slice(0, 26)}…` : ev.key}
              </p>
              <TacticalPhasePreview
                phaseType={ev.phaseType}
                title={ev.title}
                objective={ev.objective}
                action={ev.action}
                nextHint={ev.nextHint}
                customDiscordText={ev.customDiscordText}
                compact
                showMessageChrome={false}
              />
            </div>
          </details>
        );
      })}
    </div>
  );
}
