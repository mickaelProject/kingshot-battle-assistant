import { notFound } from "next/navigation";
import { TemplateEditorShell } from "@/components/template-editor-shell";
import { fetchBattleTemplateForEdit } from "@/lib/battle-templates-queries";
import { jsonToStringArray } from "@/lib/editor-phase";

export default async function EditTemplatePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const draftSource = sp.from === "roster" ? "roster" : null;
  const template = await fetchBattleTemplateForEdit(id);
  if (!template) notFound();

  const phases = template.events.map((ev) => ({
    id: ev.id,
    orderIndex: ev.orderIndex,
    offsetSeconds: ev.offsetSeconds,
    phaseType: ev.phaseType,
    key: ev.key,
    title: ev.title,
    objective: ev.objective,
    action: ev.action,
    nextHint: ev.nextHint,
    timelineScope: ev.timelineScope,
    targetedBuildings: jsonToStringArray(ev.targetedBuildings),
    assignedLeaders: jsonToStringArray(ev.assignedLeaders),
    assignedPlayers: jsonToStringArray(ev.assignedPlayers),
    customDiscordText: ev.customDiscordText ?? null,
    generatedDiscordDraft: ev.generatedDiscordDraft ?? null,
  }));

  return (
    <TemplateEditorShell
      templateId={template.id}
      name={template.name}
      description={template.description}
      eventDurationMinutes={template.eventDurationMinutes}
      eventProductKey={template.eventProductKey ?? null}
      phases={phases}
      draftSource={draftSource}
    />
  );
}
