import Link from "next/link";
import { notFound } from "next/navigation";
import { duplicateTemplateAction } from "@/actions/data";
import { PhaseTimeline } from "@/components/phase-timeline";
import { TemplateDeleteBlock } from "@/components/template-delete-block";
import { TacticalPhasePreview } from "@/components/tactical-phase-preview";
import { fetchBattleTemplateForDetail } from "@/lib/battle-templates-queries";
import { templateDurationSeconds } from "@/lib/time-human";

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

  return (
    <main>
      <p>
        <Link href="/dashboard/templates">← Templates</Link>
      </p>
      <div className="row" style={{ justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
        <h1 style={{ margin: 0 }}>{template.name}</h1>
        <form action={duplicateTemplateAction}>
          <input type="hidden" name="templateId" value={template.id} />
          <button type="submit" className="btn">
            Dupliquer le modèle
          </button>
        </form>
      </div>
      <p className="muted">
        Guilde <code>{template.guild.discordGuildId}</code>
        {template.isDefault ? (
          <>
            {" "}
            · <span className="badge default">défaut</span>
          </>
        ) : null}
      </p>
      {template.description ? <p>{template.description}</p> : null}
      <p>
        <Link href={`/dashboard/templates/${id}/edit`} className="btn primary">
          Éditer modèle & phases
        </Link>
      </p>

      <div className="card" style={{ marginTop: "1.25rem", padding: "1rem 1.25rem" }}>
        <h2 style={{ marginTop: 0, fontSize: "1rem" }}>Zone sensible</h2>
        <p className="muted" style={{ marginBottom: "0.75rem" }}>
          Supprimer ce modèle depuis l’aperçu ou l’éditeur — même règles (sessions /
          runs actifs bloquent la suppression).
        </p>
        <TemplateDeleteBlock
          templateId={template.id}
          templateName={template.name}
          errorReturnTo={`/dashboard/templates/${id}`}
        />
      </div>

      <h2>Timeline</h2>
      <div className="card">
        {template.events.length === 0 ? (
          <p className="muted">Aucune phase.</p>
        ) : (
          <PhaseTimeline phases={timelinePhases} />
        )}
      </div>

      <h2>Phases & aperçu Discord ({template.events.length})</h2>
      {template.events.length === 0 ? (
        <p className="muted">Ajoute des phases depuis l’éditeur.</p>
      ) : (
        <div className="phase-read-grid">
          {template.events.map((ev) => (
            <div key={ev.id} className="card phase-read-card">
              <div className="phase-read-card__meta">
                <span className="muted">T+{ev.offsetSeconds}s</span>
                <span className="badge badge-phase">{ev.phaseType}</span>
                <code>{ev.key}</code>
              </div>
              <TacticalPhasePreview
                phaseType={ev.phaseType}
                title={ev.title}
                objective={ev.objective}
                action={ev.action}
                nextHint={ev.nextHint}
                compact
                showMessageChrome={false}
              />
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
