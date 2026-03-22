import { Prisma } from "@prisma/client";
import { prisma } from "../db/prisma.js";
import { parseBattlePhaseType } from "../domain/phase-type.js";
import { sortTemplateEventsByOffset } from "../domain/battle-rules.js";

const battleEventOrderBy: Prisma.BattleEventDefinitionOrderByWithRelationInput[] =
  [{ offsetSeconds: "asc" }, { orderIndex: "asc" }];

const FIELD_CAP = 1024;

function cap(s: string, max: number): string {
  const t = s.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

export async function listTemplatesWithCounts(guildSettingsId: string) {
  return prisma.battleTemplate.findMany({
    where: { guildId: guildSettingsId },
    orderBy: { name: "asc" },
    include: { _count: { select: { events: true } } },
  });
}

export async function createTemplate(
  guildSettingsId: string,
  name: string,
  description?: string | null,
) {
  return prisma.battleTemplate.create({
    data: {
      guildId: guildSettingsId,
      name,
      description: description ?? undefined,
    },
  });
}

export type DeleteTemplateResult =
  | { outcome: "NOT_FOUND" }
  | { outcome: "IS_DEFAULT" }
  | { outcome: "IN_USE" }
  | { outcome: "DELETED"; name: string };

export async function deleteTemplateByName(
  guildSettingsId: string,
  name: string,
): Promise<DeleteTemplateResult> {
  const [guild, template] = await Promise.all([
    prisma.guildSettings.findUnique({
      where: { id: guildSettingsId },
      select: { defaultTemplateId: true },
    }),
    prisma.battleTemplate.findFirst({
      where: { guildId: guildSettingsId, name },
      select: { id: true },
    }),
  ]);

  if (!template) return { outcome: "NOT_FOUND" };
  if (guild?.defaultTemplateId === template.id) return { outcome: "IS_DEFAULT" };

  try {
    await prisma.battleTemplate.delete({ where: { id: template.id } });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      return { outcome: "IN_USE" };
    }
    throw e;
  }
  return { outcome: "DELETED", name };
}

export async function setDefaultTemplate(
  guildSettingsId: string,
  templateName: string,
) {
  const t = await prisma.battleTemplate.findFirst({
    where: { guildId: guildSettingsId, name: templateName },
  });
  if (!t) return { ok: false as const };

  await prisma.$transaction([
    prisma.battleTemplate.updateMany({
      where: { guildId: guildSettingsId },
      data: { isDefault: false },
    }),
    prisma.battleTemplate.update({
      where: { id: t.id },
      data: { isDefault: true },
    }),
    prisma.guildSettings.update({
      where: { id: guildSettingsId },
      data: { defaultTemplateId: t.id },
    }),
  ]);
  return { ok: true as const };
}

export type AddEventResult =
  | { ok: true }
  | {
      ok: false;
      reason: "NOT_FOUND" | "BAD_OFFSET" | "BAD_PHASE" | "BAD_TITLE";
    };

export async function addTemplateEvent(params: {
  guildSettingsId: string;
  templateName: string;
  offsetSeconds: number;
  key: string;
  phaseTypeRaw: string;
  title: string;
  objective?: string | null;
  action?: string | null;
  nextHint?: string | null;
}): Promise<AddEventResult> {
  if (
    !Number.isInteger(params.offsetSeconds) ||
    params.offsetSeconds < 0
  ) {
    return { ok: false, reason: "BAD_OFFSET" };
  }

  const phaseType = parseBattlePhaseType(params.phaseTypeRaw);
  if (!phaseType) return { ok: false, reason: "BAD_PHASE" };

  const title = params.title.trim();
  if (!title) return { ok: false, reason: "BAD_TITLE" };

  const t = await prisma.battleTemplate.findFirst({
    where: { guildId: params.guildSettingsId, name: params.templateName },
  });
  if (!t) return { ok: false, reason: "NOT_FOUND" };

  const maxOrder = await prisma.battleEventDefinition.aggregate({
    where: { templateId: t.id },
    _max: { orderIndex: true },
  });
  const orderIndex = (maxOrder._max.orderIndex ?? -1) + 1;

  await prisma.battleEventDefinition.create({
    data: {
      templateId: t.id,
      offsetSeconds: params.offsetSeconds,
      key: cap(params.key, 120),
      phaseType,
      title: cap(title, 200),
      objective: cap(params.objective ?? "", FIELD_CAP),
      action: cap(params.action ?? "", FIELD_CAP),
      nextHint: cap(params.nextHint ?? "", FIELD_CAP),
      orderIndex,
    },
  });
  return { ok: true };
}

export async function findTemplateForBattleStart(
  guildSettingsId: string,
  defaultTemplateId: string | null,
  overrideName: string | null,
) {
  if (overrideName) {
    const t = await prisma.battleTemplate.findFirst({
      where: { guildId: guildSettingsId, name: overrideName },
      include: { events: { orderBy: battleEventOrderBy } },
    });
    return t
      ? {
          ...t,
          events: sortTemplateEventsByOffset(t.events),
        }
      : null;
  }
  if (!defaultTemplateId) return null;
  const t = await prisma.battleTemplate.findUnique({
    where: { id: defaultTemplateId },
    include: { events: { orderBy: battleEventOrderBy } },
  });
  return t
    ? { ...t, events: sortTemplateEventsByOffset(t.events) }
    : null;
}

export async function autocompleteTemplateNames(
  guildSettingsId: string,
  query: string,
) {
  return prisma.battleTemplate.findMany({
    where: {
      guildId: guildSettingsId,
      name: { contains: query, mode: "insensitive" },
    },
    take: 25,
    select: { name: true },
  });
}
