"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  BattlePhaseType,
  ManagedEventStatus,
  Prisma,
  TemplateCreationSource,
} from "@prisma/client";
import { randomUUID } from "node:crypto";
import type { TimelineScope } from "@/lib/timeline-scope";
import { TIMELINE_SCOPES } from "@/lib/timeline-scope";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { fetchBattleTemplateForDuplicate } from "@/lib/battle-templates-queries";
import { assertGuildTextChannelId } from "@/lib/discord-rest";
import { parseEventDurationMinutes } from "@/lib/event-duration";

const PHASES: BattlePhaseType[] = [
  "START",
  "OBJECTIVE",
  "REMINDER",
  "FINAL",
];

function parsePhase(s: string): BattlePhaseType | null {
  return PHASES.includes(s as BattlePhaseType) ? (s as BattlePhaseType) : null;
}

function parseTimelineScope(raw: string): TimelineScope {
  return TIMELINE_SCOPES.includes(raw as TimelineScope)
    ? (raw as TimelineScope)
    : "GLOBAL";
}

function linesToStringArray(raw: string): string[] {
  return raw
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export async function createTemplateAction(formData: FormData) {
  await requireAdmin();
  const guildId = String(formData.get("guildId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const eventDurationMinutes = parseEventDurationMinutes(
    formData.get("eventDurationMinutes"),
  );
  if (!guildId || !name) return;
  const created = await prisma.battleTemplate.create({
    data: {
      guildId,
      name,
      description: description || undefined,
      eventDurationMinutes,
      creationSource: TemplateCreationSource.MANUAL,
    },
  });
  revalidatePath("/dashboard/templates");
  revalidatePath("/dashboard");
  redirect(`/dashboard/templates/${created.id}/edit`);
}

function parseLegionStartOffsetMinutes(
  raw: FormDataEntryValue | null,
): number {
  const n = Number.parseInt(String(raw ?? "0"), 10);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(n, 24 * 60);
}

export async function updateTemplateMetaAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const eventDurationMinutes = parseEventDurationMinutes(
    formData.get("eventDurationMinutes"),
  );
  const legion1StartOffsetMinutes = parseLegionStartOffsetMinutes(
    formData.get("legion1StartOffsetMinutes"),
  );
  const legion2StartOffsetMinutes = parseLegionStartOffsetMinutes(
    formData.get("legion2StartOffsetMinutes"),
  );
  if (!id || !name) return;
  await prisma.battleTemplate.update({
    where: { id },
    data: {
      name,
      description,
      eventDurationMinutes,
      legion1StartOffsetMinutes,
      legion2StartOffsetMinutes,
    },
  });
  revalidatePath("/dashboard/templates");
  revalidatePath(`/dashboard/templates/${id}`);
  revalidatePath(`/dashboard/templates/${id}/edit`);
  redirect(
    `/dashboard/templates/${id}/edit?toast=saved&toastMsg=${encodeURIComponent("Métadonnées enregistrées.")}`,
  );
}

export async function deleteTemplateAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const errorReturnTo = String(
    formData.get("errorReturnTo") ?? "",
  ).trim();
  if (!id) return;

  const template = await prisma.battleTemplate.findUnique({
    where: { id },
    select: { id: true, name: true },
  });
  const editUrl =
    errorReturnTo ||
    `/dashboard/templates/${id}/edit`;

  if (!template) {
    redirect(
      `/dashboard/templates?toast=error&toastMsg=${encodeURIComponent("Modèle introuvable.")}`,
    );
  }

  const [
    activeSessions,
    scheduledOrLiveRuns,
    sessionTotal,
    runTotal,
  ] = await Promise.all([
    prisma.battleSession.count({
      where: { templateId: id, status: "ACTIVE" },
    }),
    prisma.managedEventRun.count({
      where: {
        templateId: id,
        status: { in: ["SCHEDULED", "STARTING", "ACTIVE"] },
      },
    }),
    prisma.battleSession.count({ where: { templateId: id } }),
    prisma.managedEventRun.count({ where: { templateId: id } }),
  ]);

  if (activeSessions > 0 || scheduledOrLiveRuns > 0) {
    redirect(
      `${editUrl}?toast=error&toastMsg=${encodeURIComponent(
        "Suppression impossible : ce modèle est lié à une bataille en cours ou à un lancement planifié / actif.",
      )}`,
    );
  }

  if (sessionTotal > 0 || runTotal > 0) {
    redirect(
      `${editUrl}?toast=error&toastMsg=${encodeURIComponent(
        "Suppression impossible : ce modèle est encore référencé par l’historique des batailles ou des lancements (contrainte base de données).",
      )}`,
    );
  }

  try {
    await prisma.battleTemplate.delete({ where: { id } });
  } catch {
    redirect(
      `${editUrl}?toast=error&toastMsg=${encodeURIComponent(
        "Suppression impossible : le modèle est encore utilisé (référence externe).",
      )}`,
    );
  }

  revalidatePath("/dashboard/templates");
  revalidatePath("/dashboard");
  redirect(
    `/dashboard/templates?toast=saved&toastMsg=${encodeURIComponent(
      `Modèle « ${template.name} » supprimé.`,
    )}`,
  );
}

export async function duplicateTemplateAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("templateId") ?? "");
  if (!id) redirect("/dashboard/templates");
  const src = await fetchBattleTemplateForDuplicate(id);
  if (!src) redirect("/dashboard/templates");
  let name = `${src.name} (copie)`;
  let n = 2;
  while (
    await prisma.battleTemplate.findFirst({
      where: { guildId: src.guildId, name },
      select: { id: true },
    })
  ) {
    name = `${src.name} (copie ${n})`;
    n += 1;
  }
  const created = await prisma.battleTemplate.create({
    data: {
      guildId: src.guildId,
      name,
      description: src.description,
      eventDurationMinutes: src.eventDurationMinutes,
      legion1StartOffsetMinutes: src.legion1StartOffsetMinutes ?? 0,
      legion2StartOffsetMinutes: src.legion2StartOffsetMinutes ?? 0,
      creationSource: src.creationSource,
      eventProductKey: src.eventProductKey ?? undefined,
      isDefault: false,
      events: {
        create: src.events.map((e) => ({
          offsetSeconds: e.offsetSeconds,
          key: e.key,
          phaseType: e.phaseType,
          title: e.title,
          objective: e.objective,
          action: e.action,
          nextHint: e.nextHint,
          orderIndex: e.orderIndex,
          timelineScope: e.timelineScope,
          targetedBuildings: e.targetedBuildings ?? undefined,
          assignedLeaders: e.assignedLeaders ?? undefined,
          assignedPlayers: e.assignedPlayers ?? undefined,
          customDiscordText: e.customDiscordText ?? undefined,
          generatedDiscordDraft: e.generatedDiscordDraft ?? undefined,
        })),
      },
    },
  });
  revalidatePath("/dashboard/templates");
  redirect(
    `/dashboard/templates/${created.id}/edit?toast=duplicated&toastMsg=${encodeURIComponent(`Copie créée : ${name}`)}`,
  );
}

export async function addPhaseAction(formData: FormData) {
  await requireAdmin();
  const templateId = String(formData.get("templateId") ?? "");
  let key = String(formData.get("key") ?? "").trim();
  if (!key) {
    key = `evt-${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
  }
  const offsetSeconds = Number(formData.get("offsetSeconds"));
  const phaseTypeRaw = String(formData.get("phaseType") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const objective = String(formData.get("objective") ?? "").trim();
  const action = String(formData.get("action") ?? "").trim();
  const nextHint = String(formData.get("nextHint") ?? "").trim();
  const phaseType = parsePhase(phaseTypeRaw);
  if (!templateId || !Number.isInteger(offsetSeconds) || offsetSeconds < 0 || !phaseType || !title) return;

  const timelineScope = parseTimelineScope(
    String(formData.get("timelineScope") ?? "GLOBAL"),
  );

  const maxOrder = await prisma.battleEventDefinition.aggregate({
    where: { templateId, timelineScope },
    _max: { orderIndex: true },
  });
  const orderIndex = (maxOrder._max.orderIndex ?? -1) + 1;

  await prisma.battleEventDefinition.create({
    data: {
      templateId,
      key,
      offsetSeconds,
      phaseType,
      title,
      objective,
      action,
      nextHint,
      orderIndex,
      timelineScope,
      targetedBuildings: [],
      assignedLeaders: [],
      assignedPlayers: [],
    },
  });
  revalidatePath(`/dashboard/templates/${templateId}`);
  revalidatePath(`/dashboard/templates/${templateId}/edit`);
  redirect(
    `/dashboard/templates/${templateId}/edit?toast=saved&toastMsg=${encodeURIComponent("Phase ajoutée.")}`,
  );
}

export async function updatePhaseAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const templateId = String(formData.get("templateId") ?? "");
  const key = String(formData.get("key") ?? "").trim();
  const offsetSeconds = Number(formData.get("offsetSeconds"));
  const phaseTypeRaw = String(formData.get("phaseType") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const objective = String(formData.get("objective") ?? "").trim();
  const action = String(formData.get("action") ?? "").trim();
  const nextHint = String(formData.get("nextHint") ?? "").trim();
  const phaseType = parsePhase(phaseTypeRaw);
  if (!id || !templateId || !key || !Number.isInteger(offsetSeconds) || offsetSeconds < 0 || !phaseType || !title) return;

  const timelineScope = parseTimelineScope(
    String(formData.get("timelineScope") ?? "GLOBAL"),
  );
  const targetedBuildings = linesToStringArray(
    String(formData.get("targetedBuildings") ?? ""),
  );
  const assignedLeaders = linesToStringArray(
    String(formData.get("assignedLeaders") ?? ""),
  );
  const assignedPlayers = linesToStringArray(
    String(formData.get("assignedPlayers") ?? ""),
  );
  const customDiscordRaw = String(formData.get("customDiscordText") ?? "");
  const customDiscordText = customDiscordRaw.trim() ? customDiscordRaw : null;

  await prisma.battleEventDefinition.update({
    where: { id },
    data: {
      key,
      offsetSeconds,
      phaseType,
      title,
      objective,
      action,
      nextHint,
      timelineScope,
      targetedBuildings,
      assignedLeaders,
      assignedPlayers,
      customDiscordText,
    },
  });
  revalidatePath(`/dashboard/templates/${templateId}`);
  revalidatePath(`/dashboard/templates/${templateId}/edit`);
  redirect(
    `/dashboard/templates/${templateId}/edit?toast=saved&toastMsg=${encodeURIComponent("Phase enregistrée.")}`,
  );
}

export async function deletePhaseAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const templateId = String(formData.get("templateId") ?? "");
  if (!id || !templateId) return;
  await prisma.battleEventDefinition.delete({ where: { id } });
  revalidatePath(`/dashboard/templates/${templateId}`);
  revalidatePath(`/dashboard/templates/${templateId}/edit`);
  redirect(
    `/dashboard/templates/${templateId}/edit?toast=saved&toastMsg=${encodeURIComponent("Phase supprimée.")}`,
  );
}

export async function movePhaseAction(formData: FormData) {
  await requireAdmin();
  const phaseId = String(formData.get("phaseId") ?? "");
  const templateId = String(formData.get("templateId") ?? "");
  const dir = String(formData.get("dir") ?? "");
  if (!phaseId || !templateId || (dir !== "up" && dir !== "down")) return;

  const all = await prisma.battleEventDefinition.findMany({
    where: { templateId },
    orderBy: [{ offsetSeconds: "asc" }, { orderIndex: "asc" }],
  });
  const i = all.findIndex((p) => p.id === phaseId);
  if (i < 0) return;
  const j = dir === "up" ? i - 1 : i + 1;
  if (j < 0 || j >= all.length) return;
  const cur = all[i]!;
  const neigh = all[j]!;
  if (cur.offsetSeconds !== neigh.offsetSeconds) return;

  await prisma.$transaction([
    prisma.battleEventDefinition.update({
      where: { id: cur.id },
      data: { orderIndex: neigh.orderIndex },
    }),
    prisma.battleEventDefinition.update({
      where: { id: neigh.id },
      data: { orderIndex: cur.orderIndex },
    }),
  ]);
  revalidatePath(`/dashboard/templates/${templateId}/edit`);
  redirect(
    `/dashboard/templates/${templateId}/edit?toast=saved&toastMsg=${encodeURIComponent("Ordre des phases mis à jour.")}`,
  );
}

/**
 * Réordonne les phases d’une portée (`timelineScope`) : `orderIndex` 0..n-1 uniquement
 * (plusieurs phases peuvent partager le même T+ entre portées différentes).
 */
export async function reorderTemplatePhasesAction(formData: FormData) {
  await requireAdmin();
  const templateId = String(formData.get("templateId") ?? "");
  const ids = formData.getAll("phaseId").map(String).filter(Boolean);
  const timelineScope = parseTimelineScope(
    String(formData.get("timelineScope") ?? "GLOBAL"),
  );
  if (!templateId || ids.length === 0) {
    return { ok: false as const, error: "Données invalides." };
  }

  const allInScope = await prisma.battleEventDefinition.findMany({
    where: { templateId, timelineScope },
    orderBy: [{ offsetSeconds: "asc" }, { orderIndex: "asc" }],
  });
  if (ids.length !== allInScope.length) {
    return { ok: false as const, error: "Liste de phases incomplète." };
  }
  if (new Set(ids).size !== ids.length) {
    return { ok: false as const, error: "Liste de phases invalide." };
  }
  const idSet = new Set(allInScope.map((e) => e.id));
  for (const id of ids) {
    if (!idSet.has(id)) {
      return { ok: false as const, error: "Phase inconnue ou mauvaise portée." };
    }
  }

  try {
    await prisma.$transaction(
      ids.map((phaseId, i) =>
        prisma.battleEventDefinition.update({
          where: { id: phaseId },
          data: { orderIndex: i },
        }),
      ),
    );
  } catch (e) {
    console.error("[reorderTemplatePhasesAction]", e);
    return {
      ok: false as const,
      error: "Impossible d’enregistrer l’ordre (base de données). Réessayez.",
    };
  }
  revalidatePath(`/dashboard/templates/${templateId}/edit`);
  revalidatePath(`/dashboard/templates/${templateId}`);
  return { ok: true as const };
}

export async function restorePhaseDiscordDraftAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const templateId = String(formData.get("templateId") ?? "");
  if (!id || !templateId) return;
  const row = await prisma.battleEventDefinition.findUnique({
    where: { id },
    select: { generatedDiscordDraft: true },
  });
  const draft = row?.generatedDiscordDraft?.trim();
  await prisma.battleEventDefinition.update({
    where: { id },
    data: { customDiscordText: draft?.length ? draft : null },
  });
  revalidatePath(`/dashboard/templates/${templateId}/edit`);
  redirect(
    `/dashboard/templates/${templateId}/edit?toast=saved&toastMsg=${encodeURIComponent("Message Discord : brouillon généré restauré.")}`,
  );
}

export async function clearPhaseDiscordOverrideAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const templateId = String(formData.get("templateId") ?? "");
  if (!id || !templateId) return;
  await prisma.battleEventDefinition.update({
    where: { id },
    data: { customDiscordText: null },
  });
  revalidatePath(`/dashboard/templates/${templateId}/edit`);
  redirect(
    `/dashboard/templates/${templateId}/edit?toast=saved&toastMsg=${encodeURIComponent("Aperçu automatique (champs) réactivé.")}`,
  );
}

export type GuildSettingsFormState = {
  error?: string;
  success?: string;
};

/**
 * Guild settings form (useActionState). Validates battle channel against Discord when set.
 */
export async function updateGuildAction(
  _prev: GuildSettingsFormState,
  formData: FormData,
): Promise<GuildSettingsFormState> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const battleChannelId = String(formData.get("battleChannelId") ?? "").trim();
  const defaultTemplateId = String(formData.get("defaultTemplateId") ?? "").trim();
  if (!id) return { error: "Formulaire invalide." };

  const guild = await prisma.guildSettings.findUnique({
    where: { id },
    select: { discordGuildId: true },
  });
  if (!guild) return { error: "Guilde introuvable." };

  if (battleChannelId) {
    const existing = await prisma.guildSettings.findUnique({
      where: { id },
      select: { battleChannelId: true },
    });
    const unchanged =
      battleChannelId === (existing?.battleChannelId ?? "");
    if (!unchanged) {
      const check = await assertGuildTextChannelId(
        guild.discordGuildId,
        battleChannelId,
      );
      if (!check.ok) return { error: check.error };
    }
  }

  if (defaultTemplateId) {
    const tpl = await prisma.battleTemplate.findFirst({
      where: { id: defaultTemplateId, guildId: id },
      select: { id: true },
    });
    if (!tpl) {
      return {
        error: "Le modèle par défaut choisi n’appartient pas à cette guilde.",
      };
    }
    await prisma.$transaction([
      prisma.battleTemplate.updateMany({
        where: { guildId: id },
        data: { isDefault: false },
      }),
      prisma.battleTemplate.update({
        where: { id: defaultTemplateId },
        data: { isDefault: true },
      }),
      prisma.guildSettings.update({
        where: { id },
        data: {
          battleChannelId: battleChannelId || null,
          defaultTemplateId,
        },
      }),
    ]);
  } else {
    await prisma.$transaction([
      prisma.battleTemplate.updateMany({
        where: { guildId: id },
        data: { isDefault: false },
      }),
      prisma.guildSettings.update({
        where: { id },
        data: {
          battleChannelId: battleChannelId || null,
          defaultTemplateId: null,
        },
      }),
    ]);
  }
  revalidatePath("/dashboard/server");
  revalidatePath("/dashboard/guild");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/templates");
  revalidatePath("/dashboard/events");
  revalidatePath("/dashboard/launch");
  return { success: "Paramètres enregistrés." };
}

export type ManagedRunActionResult =
  | { ok: true }
  | { ok: false; error: string };

function legionOffsetsFallbackMinutes(
  scheduledAt: Date,
  legion1StartsAt: Date | null,
  legion2StartsAt: Date | null,
): { legion1StartOffsetMinutes: number; legion2StartOffsetMinutes: number } {
  const minutesAfter = (legion: Date | null) =>
    legion != null
      ? Math.max(
          0,
          Math.round((legion.getTime() - scheduledAt.getTime()) / 60_000),
        )
      : 0;
  return {
    legion1StartOffsetMinutes: minutesAfter(legion1StartsAt),
    legion2StartOffsetMinutes: minutesAfter(legion2StartsAt),
  };
}

/**
 * Crée un ManagedEventRun : schéma courant (`legion*StartsAt`), sinon SQL brut avec
 * ces colonnes, sinon SQL brut avec `legion*StartOffsetMinutes` (base entre deux migrations).
 * Le client Prisma actuel n’a plus les champs offset : pas de `create()` avec offsets.
 */
async function createManagedEventRunRow(opts: {
  guildSettingsId: string;
  templateId: string;
  channelId: string;
  channelNameSnapshot: string | null;
  scheduledAt: Date;
  legion1StartsAt: Date | null;
  legion2StartsAt: Date | null;
}): Promise<{ id: string }> {
  const common = {
    guildSettingsId: opts.guildSettingsId,
    templateId: opts.templateId,
    channelId: opts.channelId,
    channelNameSnapshot: opts.channelNameSnapshot,
    scheduledAt: opts.scheduledAt,
    status: ManagedEventStatus.SCHEDULED,
  };

  try {
    return await prisma.managedEventRun.create({
      data: {
        ...common,
        legion1StartsAt: opts.legion1StartsAt,
        legion2StartsAt: opts.legion2StartsAt,
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const staleClient =
      e instanceof Prisma.PrismaClientValidationError ||
      /Unknown argument|Unknown field|legion1StartsAt/i.test(msg);
    if (!staleClient) throw e;
  }

  const runId = randomUUID();
  const now = new Date();
  try {
    const rows = await prisma.$queryRaw<{ id: string }[]>`
      INSERT INTO "ManagedEventRun" (
        "id",
        "guildSettingsId",
        "templateId",
        "channelId",
        "channelNameSnapshot",
        "scheduledAt",
        "legion1StartsAt",
        "legion2StartsAt",
        "createdAt",
        "updatedAt"
      )
      VALUES (
        ${runId},
        ${opts.guildSettingsId},
        ${opts.templateId},
        ${opts.channelId},
        ${opts.channelNameSnapshot},
        ${opts.scheduledAt},
        ${opts.legion1StartsAt},
        ${opts.legion2StartsAt},
        ${now},
        ${now}
      )
      RETURNING "id"
    `;
    const id = rows[0]?.id;
    if (!id) throw new Error("ManagedEventRun : RETURNING id vide.");
    return { id };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const code =
      e instanceof Prisma.PrismaClientKnownRequestError ? e.code : "";
    const oldSchema =
      code === "P2010" ||
      code === "P2022" ||
      /42703|does not exist|legion1StartsAt|column/i.test(msg);
    if (!oldSchema) throw e;

    const offsets = legionOffsetsFallbackMinutes(
      opts.scheduledAt,
      opts.legion1StartsAt,
      opts.legion2StartsAt,
    );
    const legacyRunId = randomUUID();
    const legacyNow = new Date();
    try {
      const legacyRows = await prisma.$queryRaw<{ id: string }[]>`
        INSERT INTO "ManagedEventRun" (
          "id",
          "guildSettingsId",
          "templateId",
          "channelId",
          "channelNameSnapshot",
          "scheduledAt",
          "legion1StartOffsetMinutes",
          "legion2StartOffsetMinutes",
          "createdAt",
          "updatedAt"
        )
        VALUES (
          ${legacyRunId},
          ${opts.guildSettingsId},
          ${opts.templateId},
          ${opts.channelId},
          ${opts.channelNameSnapshot},
          ${opts.scheduledAt},
          ${offsets.legion1StartOffsetMinutes},
          ${offsets.legion2StartOffsetMinutes},
          ${legacyNow},
          ${legacyNow}
        )
        RETURNING "id"
      `;
      const legacyId = legacyRows[0]?.id;
      if (!legacyId) {
        throw new Error("ManagedEventRun (décalages légion) : RETURNING id vide.");
      }
      return { id: legacyId };
    } catch (legacyErr) {
      const detail =
        legacyErr instanceof Error ? legacyErr.message : String(legacyErr);
      throw new Error(
        `Impossible d’enregistrer le run. Exécutez les migrations Prisma dans apps/bot (colonnes legion1StartsAt / legion2StartsAt), puis \`npx prisma generate\`. — ${detail}`,
      );
    }
  }
}

export async function createManagedRunAction(
  formData: FormData,
): Promise<ManagedRunActionResult> {
  await requireAdmin();
  const guildSettingsId = String(formData.get("guildSettingsId") ?? "");
  const templateId = String(formData.get("templateId") ?? "");
  const channelId = String(formData.get("channelId") ?? "").trim();
  const channelNameSnapshot =
    String(formData.get("channelNameSnapshot") ?? "").trim() || null;
  const whenRaw = String(formData.get("scheduledAt") ?? "");
  const launchNow = formData.get("launchNow") === "on";
  const legion1StartsAtUtcRaw = String(
    formData.get("legion1StartsAtUtc") ?? "",
  ).trim();
  const legion2StartsAtUtcRaw = String(
    formData.get("legion2StartsAtUtc") ?? "",
  ).trim();
  let legion1StartsAt: Date | null = null;
  let legion2StartsAt: Date | null = null;
  if (legion1StartsAtUtcRaw) {
    legion1StartsAt = new Date(legion1StartsAtUtcRaw);
    if (Number.isNaN(legion1StartsAt.getTime())) {
      return {
        ok: false,
        error: "Heure de début Légion 1 (UTC) invalide.",
      };
    }
  }
  if (legion2StartsAtUtcRaw) {
    legion2StartsAt = new Date(legion2StartsAtUtcRaw);
    if (Number.isNaN(legion2StartsAt.getTime())) {
      return {
        ok: false,
        error: "Heure de début Légion 2 (UTC) invalide.",
      };
    }
  }

  if (!guildSettingsId || !templateId) {
    return { ok: false, error: "Guilde ou modèle manquant." };
  }
  if (!channelId) {
    return {
      ok: false,
      error: "Choisis un salon texte Discord pour publier la bataille.",
    };
  }

  const guild = await prisma.guildSettings.findUnique({
    where: { id: guildSettingsId },
    select: { discordGuildId: true },
  });
  if (!guild) {
    return { ok: false, error: "Guilde introuvable." };
  }

  const tpl = await prisma.battleTemplate.findFirst({
    where: { id: templateId, guildId: guildSettingsId },
    select: { id: true },
  });
  if (!tpl) {
    return {
      ok: false,
      error: "Ce modèle n’appartient pas à la guilde sélectionnée.",
    };
  }

  const chCheck = await assertGuildTextChannelId(
    guild.discordGuildId,
    channelId,
  );
  if (!chCheck.ok) return { ok: false, error: chCheck.error };

  let scheduledAt: Date;
  if (launchNow) {
    scheduledAt = new Date();
  } else {
    if (!whenRaw) {
      return {
        ok: false,
        error: "Indique une date et heure de départ, ou coche « Lancer tout de suite ».",
      };
    }
    scheduledAt = new Date(whenRaw);
    if (Number.isNaN(scheduledAt.getTime())) {
      return { ok: false, error: "Date ou heure invalide." };
    }
  }

  const run = await createManagedEventRunRow({
    guildSettingsId,
    templateId,
    channelId,
    channelNameSnapshot,
    scheduledAt,
    legion1StartsAt,
    legion2StartsAt,
  });
  try {
    const l1 = legion1StartsAt?.toISOString() ?? "aligné alliance";
    const l2 = legion2StartsAt?.toISOString() ?? "aligné alliance";
    await prisma.managedEventRunLog.create({
      data: {
        runId: run.id,
        level: "info",
        message: `Run créé depuis l’admin · ${launchNow ? "immédiat" : `planifié ${scheduledAt.toISOString()}`} · salon ${channelId} · L1 ${l1} · L2 ${l2}`,
      },
    });
  } catch {
    /* ignore if logs table missing in old DB */
  }
  revalidatePath("/dashboard/runs");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/events");
  revalidatePath("/dashboard/launch");
  return { ok: true };
}

export async function cancelRunAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const updated = await prisma.managedEventRun.updateMany({
    where: { id, status: "SCHEDULED" },
    data: { status: "CANCELLED" },
  });
  if (updated.count > 0) {
    try {
      await prisma.managedEventRunLog.create({
        data: {
          runId: id,
          level: "info",
          message: "Run annulé depuis l’admin web.",
        },
      });
    } catch {
      /* ignore */
    }
  }
  revalidatePath("/dashboard/runs");
  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/runs/${id}`);
}
