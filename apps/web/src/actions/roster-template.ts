"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import {
  generatePhasesFromRoster,
  parseRosterLines,
  pickLeaderCandidates,
  type RosterEventType,
  type RosterPlayer,
} from "@/lib/roster-template";
import { parseEventDurationMinutes } from "@/lib/event-duration";
import { prisma } from "@/lib/prisma";

const MAX_ROSTER_LINES = 250;
const MAX_PLAYERS = 200;

const EVENT_TYPES: RosterEventType[] = [
  "GENERIC",
  "RALLY",
  "FIELD_BATTLE",
  "SIEGE",
];

export type RosterPreviewState =
  | null
  | { ok: false; error: string }
  | {
      ok: true;
      players: RosterPlayer[];
      leaders: RosterPlayer[];
      phasesSummary: {
        offsetSeconds: number;
        phaseType: string;
        title: string;
      }[];
      echo: {
        guildId: string;
        name: string;
        eventType: RosterEventType;
        eventDurationMinutes: number;
        rosterText: string;
        notes: string;
      };
    };

function parseEventType(raw: string): RosterEventType {
  return EVENT_TYPES.includes(raw as RosterEventType)
    ? (raw as RosterEventType)
    : "GENERIC";
}

function runGeneration(
  rosterText: string,
  eventType: RosterEventType,
  notes: string,
): {
  players: RosterPlayer[];
  leaders: RosterPlayer[];
  phases: ReturnType<typeof generatePhasesFromRoster>;
} {
  const lines = rosterText.split(/\r?\n/).length;
  if (lines > MAX_ROSTER_LINES) {
    throw new Error(`Trop de lignes (max ${MAX_ROSTER_LINES}).`);
  }
  const players = parseRosterLines(rosterText).slice(0, MAX_PLAYERS);
  if (players.length === 0) {
    throw new Error(
      "Aucun joueur reconnu. Utilise des lignes du type « NOM 3704 ».",
    );
  }
  const leaders = pickLeaderCandidates(players);
  const phases = generatePhasesFromRoster({
    players,
    eventType,
    notes,
  });
  return { players, leaders, phases };
}

export async function previewRosterTemplateAction(
  _prev: RosterPreviewState,
  formData: FormData,
): Promise<RosterPreviewState> {
  await requireAdmin();
  const guildId = String(formData.get("guildId") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const rosterText = String(formData.get("rosterText") ?? "");
  const notes = String(formData.get("notes") ?? "");
  const eventType = parseEventType(String(formData.get("eventType") ?? ""));
  const eventDurationMinutes = parseEventDurationMinutes(
    formData.get("eventDurationMinutes"),
  );

  if (!guildId || !name) {
    return { ok: false, error: "Guilde et nom du modèle requis." };
  }

  try {
    const { players, leaders, phases } = runGeneration(
      rosterText,
      eventType,
      notes,
    );
    return {
      ok: true,
      players,
      leaders,
      phasesSummary: phases.map((p) => ({
        offsetSeconds: p.offsetSeconds,
        phaseType: p.phaseType,
        title: p.title,
      })),
      echo: {
        guildId,
        name,
        eventType,
        eventDurationMinutes,
        rosterText,
        notes,
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
  const rosterText = String(formData.get("rosterText") ?? "");
  const notes = String(formData.get("notes") ?? "");
  const eventType = parseEventType(String(formData.get("eventType") ?? ""));
  const eventDurationMinutes = parseEventDurationMinutes(
    formData.get("eventDurationMinutes"),
  );

  if (!guildId || !name) {
    redirect(
      `/dashboard/templates/new/roster?toast=error&toastMsg=${encodeURIComponent("Guilde et nom du modèle requis.")}`,
    );
  }

  let phases: ReturnType<typeof generatePhasesFromRoster>;
  try {
    const r = runGeneration(rosterText, eventType, notes);
    phases = r.phases;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    redirect(
      `/dashboard/templates/new/roster?toast=error&toastMsg=${encodeURIComponent(msg)}`,
    );
  }

  const metaDesc = `Brouillon généré depuis un roster (${new Date().toISOString().slice(0, 10)}). Type : ${eventType}. Durée événement cible : ${eventDurationMinutes} min. À valider par un officier avant lancement.`;

  const template = await prisma.$transaction(async (tx) => {
    const t = await tx.battleTemplate.create({
      data: {
        guildId,
        name,
        description: metaDesc,
        eventDurationMinutes,
      },
    });
    for (const p of phases) {
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
        },
      });
    }
    return t;
  });

  revalidatePath("/dashboard/templates");
  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/templates/${template.id}/edit`);
  redirect(
    `/dashboard/templates/${template.id}/edit?from=roster&toast=saved&toastMsg=${encodeURIComponent("Brouillon roster créé : peaufine les phases dans l’éditeur.")}`,
  );
}
