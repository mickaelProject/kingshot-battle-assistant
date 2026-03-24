"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { TemplateCreationSource } from "@prisma/client";
import { requireAdmin } from "@/lib/auth";
import { parseEventDurationMinutesStrict } from "@/lib/event-duration";
import {
  assertTimelineCoversDuration,
  generateDraftPhasesFromRoster,
  computeRosterGroups,
  pickLeaderCandidates,
  type RosterGroups,
} from "@/lib/roster-generation.service";
import {
  buildFullTacticalWarPlan,
  combineLegionRosterFields,
  ensureParsedLegions,
  mergeLegionPlayersUnique,
  mergeTacticalAppendixIntoPhases,
  type BattleArchetype,
  type TacticalWarPlan,
} from "@/lib/tactical-war-plan";
import {
  buildSwordlandMultiTimelinePhases,
  composeDiscordDraftFromPhase,
  type GeneratedSwordlandPhase,
} from "@/lib/swordland-multi-timeline";
import type {
  GeneratedRosterPhase,
  PlayStyle,
  RosterEventType,
  RosterPlayer,
} from "@/lib/roster-template/types";
import { prisma } from "@/lib/prisma";
import {
  getEventPresetById,
  presetAllowsWizardFlow,
} from "@/lib/event-type-registry";
import { wizardPresetToEventProductKey } from "@/lib/events/event-registry";

const MAX_ROSTER_LINES = 250;
const MAX_PLAYERS = 200;

type PhaseTextEdits = {
  title?: string;
  objective?: string;
  action?: string;
  nextHint?: string;
};

function parsePhaseEditsFromForm(
  raw: FormDataEntryValue | null,
): Record<string, PhaseTextEdits> {
  const s = String(raw ?? "").trim();
  if (!s) return {};
  try {
    const parsed = JSON.parse(s) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }
    const out: Record<string, PhaseTextEdits> = {};
    for (const [key, val] of Object.entries(parsed as Record<string, unknown>)) {
      if (!val || typeof val !== "object" || Array.isArray(val)) continue;
      const o = val as Record<string, unknown>;
      const edit: PhaseTextEdits = {};
      if (typeof o.title === "string") edit.title = o.title;
      if (typeof o.objective === "string") edit.objective = o.objective;
      if (typeof o.action === "string") edit.action = o.action;
      if (typeof o.nextHint === "string") edit.nextHint = o.nextHint;
      if (Object.keys(edit).length > 0) out[key] = edit;
    }
    return out;
  } catch {
    return {};
  }
}

function applyPhaseTextEdits(
  phases: GeneratedRosterPhase[],
  edits: Record<string, PhaseTextEdits>,
): GeneratedRosterPhase[] {
  if (Object.keys(edits).length === 0) return phases;
  return phases.map((p) => {
    const e = edits[p.key];
    if (!e) return p;
    return {
      ...p,
      ...(e.title !== undefined ? { title: e.title } : {}),
      ...(e.objective !== undefined ? { objective: e.objective } : {}),
      ...(e.action !== undefined ? { action: e.action } : {}),
      ...(e.nextHint !== undefined ? { nextHint: e.nextHint } : {}),
    };
  });
}

function refreshSwordlandDiscordDrafts(
  phases: GeneratedRosterPhase[],
): GeneratedRosterPhase[] {
  return phases.map((p) => {
    if (
      !("generatedDiscordDraft" in p) ||
      typeof (p as GeneratedSwordlandPhase).generatedDiscordDraft !== "string"
    ) {
      return p;
    }
    const sp = p as GeneratedSwordlandPhase;
    return {
      ...p,
      generatedDiscordDraft: composeDiscordDraftFromPhase(sp),
    };
  });
}

const EVENT_TYPES: RosterEventType[] = [
  "GENERIC",
  "RALLY",
  "FIELD_BATTLE",
  "SIEGE",
];

const PLAY_STYLES: PlayStyle[] = ["aggressive", "balanced", "defensive"];

export type RosterPreviewState =
  | null
  | { ok: false; error: string }
  | {
      ok: true;
      players: RosterPlayer[];
      leaders: RosterPlayer[];
      groups: RosterGroups;
      phases: GeneratedRosterPhase[];
      phasesSummary: {
        offsetSeconds: number;
        phaseType: string;
        title: string;
      }[];
      timelineCoversDuration: boolean;
      warnings: string[];
      echo: {
        guildId: string;
        name: string;
        eventType: RosterEventType;
        playStyle: PlayStyle;
        eventDurationMinutes: number;
        rosterText: string;
        rosterLegion1Text: string;
        rosterLegion2Text: string;
        notes: string;
        swordlandShowdownPreset: boolean;
        battleArchetype: BattleArchetype;
        eventPresetId: string;
        legion1StartOffsetMinutes: number;
        legion2StartOffsetMinutes: number;
      };
      battleArchetype: BattleArchetype;
      tacticalPlan: TacticalWarPlan;
    };

function parseEventType(raw: string): RosterEventType {
  return EVENT_TYPES.includes(raw as RosterEventType)
    ? (raw as RosterEventType)
    : "GENERIC";
}

function parsePlayStyle(raw: string): PlayStyle {
  return PLAY_STYLES.includes(raw as PlayStyle)
    ? (raw as PlayStyle)
    : "balanced";
}

function mergedRosterTextFromForm(formData: FormData): string {
  const l1 = String(formData.get("rosterText") ?? "");
  const l2 = String(formData.get("rosterTextLegion2") ?? "");
  return combineLegionRosterFields(l1, l2);
}

function parseEventPresetId(raw: string): string {
  const t = String(raw ?? "").trim();
  return t || "swordland_showdown";
}

function parseLegionStartOffsetMinutes(
  raw: FormDataEntryValue | null,
): number {
  const n = Number.parseInt(String(raw ?? "0"), 10);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(n, 24 * 60);
}

function runGeneration(
  rosterText: string,
  eventType: RosterEventType,
  notes: string,
  eventDurationMinutes: number,
  playStyle: PlayStyle,
  swordlandShowdownPreset: boolean,
  battleArchetype: BattleArchetype,
): {
  players: RosterPlayer[];
  leaders: RosterPlayer[];
  groups: RosterGroups;
  phases: GeneratedRosterPhase[];
  warnings: string[];
  tacticalPlan: TacticalWarPlan;
} {
  const lines = rosterText.split(/\r?\n/).length;
  if (lines > MAX_ROSTER_LINES) {
    throw new Error(`Trop de lignes (max ${MAX_ROSTER_LINES}).`);
  }
  const parsedLegions = ensureParsedLegions(rosterText);
  const merged = mergeLegionPlayersUnique(parsedLegions);
  const trimmed = merged.slice(0, MAX_PLAYERS);
  if (trimmed.length === 0) {
    throw new Error(
      "Aucun joueur reconnu. Utilisez des lignes du type « CRICKETTS 3704 » (nom puis nombre).",
    );
  }
  const groups = computeRosterGroups(trimmed);
  const leaders = pickLeaderCandidates(trimmed);
  const effectiveOrbat: BattleArchetype = swordlandShowdownPreset
    ? "SWORDLAND"
    : battleArchetype;

  let phases: GeneratedRosterPhase[];
  let tacticalPlan: TacticalWarPlan;

  if (swordlandShowdownPreset && effectiveOrbat === "SWORDLAND") {
    tacticalPlan = buildFullTacticalWarPlan(
      "SWORDLAND",
      parsedLegions,
      7,
    );
    phases = buildSwordlandMultiTimelinePhases({
      eventDurationMinutes,
      notes,
      tacticalPlan,
      parsedLegions,
    });
    if (!assertTimelineCoversDuration(phases, eventDurationMinutes)) {
      const dur = eventDurationMinutes * 60;
      for (let i = phases.length - 1; i >= 0; i--) {
        if (phases[i]!.phaseType === "FINAL") {
          phases[i]!.offsetSeconds = dur;
          break;
        }
      }
    }
  } else {
    phases = generateDraftPhasesFromRoster({
      players: trimmed,
      eventType,
      notes,
      eventDurationMinutes,
      playStyle,
      swordlandShowdownPreset,
    });
    if (!assertTimelineCoversDuration(phases, eventDurationMinutes)) {
      phases[phases.length - 1]!.offsetSeconds = eventDurationMinutes * 60;
    }
    tacticalPlan = buildFullTacticalWarPlan(
      effectiveOrbat,
      parsedLegions,
      phases.length,
    );
    if (tacticalPlan.phaseOverlays.length > 0) {
      phases = mergeTacticalAppendixIntoPhases(
        phases,
        tacticalPlan.phaseOverlays,
      );
    }
  }

  const warnings: string[] = [];
  if (trimmed.length < 3) {
    warnings.push(
      "Peu de joueurs dans le roster — le brouillon reste utilisable mais très générique.",
    );
  }
  if (parsedLegions.length > 1) {
    warnings.push(
      `${parsedLegions.length} légions — timelines GLOBAL + par légion générées (Discord = GLOBAL uniquement).`,
    );
  } else if (swordlandShowdownPreset) {
    warnings.push(
      "Timeline GLOBAL + Légion 1 — renseignez L2 pour la fiche Légion 2.",
    );
  }
  return { players: trimmed, leaders, groups, phases, warnings, tacticalPlan };
}

export async function previewRosterTemplateAction(
  _prev: RosterPreviewState,
  formData: FormData,
): Promise<RosterPreviewState> {
  await requireAdmin();
  const guildId = String(formData.get("guildId") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const rosterLegion1Text = String(formData.get("rosterText") ?? "");
  const rosterLegion2Text = String(formData.get("rosterTextLegion2") ?? "");
  const rosterText = mergedRosterTextFromForm(formData);
  const notes = String(formData.get("notes") ?? "");
  const eventType = parseEventType(String(formData.get("eventType") ?? ""));
  const playStyle = parsePlayStyle(String(formData.get("playStyle") ?? ""));
  const durationRaw = formData.get("eventDurationMinutes");
  const eventDurationMinutes = parseEventDurationMinutesStrict(durationRaw);
  const eventPresetId = parseEventPresetId(
    String(formData.get("eventPresetId") ?? ""),
  );
  const presetMeta = getEventPresetById(eventPresetId);
  if (!presetMeta || !presetAllowsWizardFlow(presetMeta)) {
    return {
      ok: false,
      error:
        "Ce type d’événement n’est pas encore pris en charge pour la génération depuis roster.",
    };
  }
  const battleArchetype = presetMeta.battleArchetype;
  const swordlandShowdownPreset = presetMeta.id === "swordland_showdown";
  const legion1StartOffsetMinutes = parseLegionStartOffsetMinutes(
    formData.get("legion1StartOffsetMinutes"),
  );
  const legion2StartOffsetMinutes = parseLegionStartOffsetMinutes(
    formData.get("legion2StartOffsetMinutes"),
  );

  if (!guildId || !name) {
    return { ok: false, error: "Guilde et nom du modèle sont requis." };
  }
  if (eventDurationMinutes === null) {
    return {
      ok: false,
      error: "Indiquez une durée d’événement valide (en minutes, minimum 1).",
    };
  }

  try {
    const { players, leaders, groups, phases, warnings, tacticalPlan } =
      runGeneration(
        rosterText,
        eventType,
        notes,
        eventDurationMinutes,
        playStyle,
        swordlandShowdownPreset,
        battleArchetype,
      );
    const discordPhases = phases.filter(
      (p) => !p.timelineScope || p.timelineScope === "GLOBAL",
    );
    return {
      ok: true,
      players,
      leaders,
      groups,
      phases,
      battleArchetype,
      tacticalPlan,
      phasesSummary: discordPhases.map((p) => ({
        offsetSeconds: p.offsetSeconds,
        phaseType: p.phaseType,
        title: p.title,
      })),
      timelineCoversDuration: assertTimelineCoversDuration(
        phases,
        eventDurationMinutes,
      ),
      warnings,
      echo: {
        guildId,
        name,
        eventType,
        playStyle,
        eventDurationMinutes,
        rosterText,
        rosterLegion1Text,
        rosterLegion2Text,
        notes,
        swordlandShowdownPreset,
        battleArchetype,
        eventPresetId,
        legion1StartOffsetMinutes,
        legion2StartOffsetMinutes,
      },
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg };
  }
}

export async function createTemplateFromRosterAction(formData: FormData) {
  await requireAdmin();
  const guildId = String(formData.get("guildId") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const rosterText = mergedRosterTextFromForm(formData);
  const notes = String(formData.get("notes") ?? "");
  const eventType = parseEventType(String(formData.get("eventType") ?? ""));
  const playStyle = parsePlayStyle(String(formData.get("playStyle") ?? ""));
  const eventDurationMinutes = parseEventDurationMinutesStrict(
    formData.get("eventDurationMinutes"),
  );
  const eventPresetId = parseEventPresetId(
    String(formData.get("eventPresetId") ?? ""),
  );
  const presetMeta = getEventPresetById(eventPresetId);
  if (!presetMeta || !presetAllowsWizardFlow(presetMeta)) {
    redirect(
      `/dashboard/templates/new/roster?toast=error&toastMsg=${encodeURIComponent("Type d’événement non pris en charge pour cette génération.")}`,
    );
  }
  const battleArchetype = presetMeta.battleArchetype;
  const swordlandShowdownPreset = presetMeta.id === "swordland_showdown";
  const legion1StartOffsetMinutes = parseLegionStartOffsetMinutes(
    formData.get("legion1StartOffsetMinutes"),
  );
  const legion2StartOffsetMinutes = parseLegionStartOffsetMinutes(
    formData.get("legion2StartOffsetMinutes"),
  );

  if (!guildId || !name) {
    redirect(
      `/dashboard/templates/new/roster?toast=error&toastMsg=${encodeURIComponent("Guilde et nom du modèle requis.")}`,
    );
  }
  if (eventDurationMinutes === null) {
    redirect(
      `/dashboard/templates/new/roster?toast=error&toastMsg=${encodeURIComponent("Durée d’événement requise (minutes).")}`,
    );
  }

  const phaseEdits = parsePhaseEditsFromForm(formData.get("phaseEditsJson"));

  let phases: GeneratedRosterPhase[];
  try {
    const r = runGeneration(
      rosterText,
      eventType,
      notes,
      eventDurationMinutes,
      playStyle,
      swordlandShowdownPreset,
      battleArchetype,
    );
    phases = refreshSwordlandDiscordDrafts(
      applyPhaseTextEdits(r.phases, phaseEdits),
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    redirect(
      `/dashboard/templates/new/roster?toast=error&toastMsg=${encodeURIComponent(msg)}`,
    );
  }

  const desc = [
    "Brouillon généré depuis un roster — relire et ajuster avant lancement.",
    `Durée événement : ${eventDurationMinutes} min · Style : ${playStyle} · Type : ${eventType} · Arc tactique : ${battleArchetype} · Preset : ${eventPresetId}.`,
    `Créé le ${new Date().toISOString().slice(0, 10)}.`,
  ].join(" ");

  const eventProductKey = wizardPresetToEventProductKey(eventPresetId);

  const template = await prisma.$transaction(async (tx) => {
    const t = await tx.battleTemplate.create({
      data: {
        guildId,
        name,
        description: desc,
        eventDurationMinutes,
        legion1StartOffsetMinutes,
        legion2StartOffsetMinutes,
        creationSource: TemplateCreationSource.ROSTER_GENERATED,
        eventProductKey,
      },
    });
    for (const p of phases) {
      const sword = p as GeneratedSwordlandPhase;
      const isSword =
        "timelineScope" in sword && sword.timelineScope != null;
      await tx.battleEventDefinition.create({
        data: {
          templateId: t.id,
          key: p.key,
          offsetSeconds: p.offsetSeconds,
          phaseType: p.phaseType,
          title: p.title,
          objective: p.objective,
          action: p.action,
          nextHint: p.nextHint,
          orderIndex: p.orderIndex,
          ...(isSword
            ? {
                timelineScope: sword.timelineScope,
                targetedBuildings: sword.targetedBuildings,
                assignedLeaders: sword.assignedLeaders,
                assignedPlayers: sword.assignedPlayers,
                generatedDiscordDraft: sword.generatedDiscordDraft,
              }
            : {}),
        },
      });
    }
    return t;
  });

  revalidatePath("/dashboard/templates");
  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/templates/${template.id}/edit`);
  redirect(
    `/dashboard/templates/${template.id}/edit?from=roster&toast=saved&toastMsg=${encodeURIComponent("Modèle enregistré : peaufinez les phases dans l’éditeur.")}`,
  );
}
