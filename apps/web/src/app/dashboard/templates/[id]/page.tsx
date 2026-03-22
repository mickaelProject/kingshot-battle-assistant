import Link from "next/link";
import { notFound } from "next/navigation";
import { duplicateTemplateAction } from "@/actions/data";
import { PhaseTimeline } from "@/components/phase-timeline";
import { TemplateDeleteBlock } from "@/components/template-delete-block";
import { TemplateReadOnlyPhaseCards } from "@/components/template-read-only-phases";
import { fetchBattleTemplateForDetail } from "@/lib/battle-templates-queries";
import {
  formatDurationHuman,
  templateDurationSeconds,
} from "@/lib/time-human";

export default async function TemplateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const template = await fetchBattleTemplateForDetail(id);
  if (!template) notFound();

  const timelineSpanSec = templateDurationSeconds(
    template.events.map((e) => e.offsetSeconds),
  );

  const timelinePhases = template.events.map((ev) => ({
    id: ev.id,
    offsetSeconds: ev.offsetSeconds,
    phaseType: ev.phaseType,
    key: ev.key,
    title: ev.title,
  }));

  const readOnlyEvents = template.events.map((ev) => ({
    id: ev.id,
    offsetSeconds: ev.offsetSeconds,
    phaseType: ev.phaseType,
    key: ev.key,
    title: ev.title,
    objective: ev.objective,
    action: ev.action,
    nextHint: ev.nextHint,
    customDiscordText: ev.customDiscordText,
  }));

  return (
    <main className="template-detail-read mx-auto max-w-5xl space-y-6 pb-10">
      <p>
        <Link href="/dashboard/templates" className="text-sm text-slate-400 hover:text-slate-200">
          ← Templates
        </Link>
      </p>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <h1 className="font-rajdhani text-2xl font-bold tracking-tight text-slate-100 md:text-3xl">
          {template.name}
        </h1>
        <form action={duplicateTemplateAction} className="shrink-0">
          <input type="hidden" name="templateId" value={template.id} />
          <button
            type="submit"
            className="rounded-xl border border-[#2a3042] bg-[#121826] px-4 py-2 text-sm font-medium text-slate-300 transition-colors hover:border-[#3f4654] hover:text-white"
          >
            Dupliquer le modèle
          </button>
        </form>
      </div>
      <p className="text-sm text-slate-500">
        Guilde <code className="rounded bg-[#0B0F17] px-1.5 py-0.5 text-slate-400">{template.guild.discordGuildId}</code>
        {template.isDefault ? (
          <>
            {" "}
            · <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-xs font-medium text-emerald-400">défaut</span>
          </>
        ) : null}
        {" · "}
        <span className="text-slate-600">
          {template.eventDurationMinutes} min · dernière annonce ~{" "}
          {formatDurationHuman(timelineSpanSec)}
        </span>
      </p>
      {template.description ? (
        <p className="text-sm leading-relaxed text-slate-400">{template.description}</p>
      ) : null}
      <p>
        <Link
          href={`/dashboard/templates/${id}/edit`}
          className="inline-flex rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-bold text-black shadow-[0_0_20px_rgba(245,158,11,0.2)] transition-colors hover:bg-amber-400"
        >
          Éditer modèle & phases
        </Link>
      </p>

      <div className="rounded-2xl border border-[#1e2230] bg-[#121826] p-4 shadow-lg shadow-black/20 ring-1 ring-red-500/10">
        <h2 className="mt-0 font-rajdhani text-sm font-semibold uppercase tracking-wider text-slate-400">
          Zone sensible
        </h2>
        <p className="mb-3 text-sm text-slate-500">
          Supprimer ce modèle depuis l’aperçu ou l’éditeur — même règles (sessions /
          runs actifs bloquent la suppression).
        </p>
        <TemplateDeleteBlock
          templateId={template.id}
          templateName={template.name}
          errorReturnTo={`/dashboard/templates/${id}`}
        />
      </div>

      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h2 className="font-rajdhani text-lg font-bold text-slate-100">
            Déroulé
          </h2>
          <span className="text-xs text-slate-600">
            {template.events.length} phase{template.events.length !== 1 ? "s" : ""}{" "}
            · frise schématique
          </span>
        </div>
        <div className="rounded-2xl border border-[#1e2230] bg-[#121826]/80 p-3 sm:p-4">
          {template.events.length === 0 ? (
            <p className="text-sm text-slate-500">Aucune phase.</p>
          ) : (
            <PhaseTimeline phases={timelinePhases} />
          )}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-rajdhani text-lg font-bold text-slate-100">
          Phases & aperçu Discord ({template.events.length})
        </h2>
        <p className="text-sm text-slate-600">
          Cartes courtes : l’aperçu complet type Discord est dans chaque bloc
          (déplier).
        </p>
        {template.events.length === 0 ? (
          <p className="text-sm text-slate-500">Ajoute des phases depuis l’éditeur.</p>
        ) : (
          <TemplateReadOnlyPhaseCards events={readOnlyEvents} />
        )}
      </section>
    </main>
  );
}
