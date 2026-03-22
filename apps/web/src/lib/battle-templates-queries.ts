import { type BattlePhaseType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Si la migration `20260322140000_template_event_duration` n’a pas été appliquée,
 * PostgreSQL renvoie P2022 sur `eventDurationMinutes`. On retombe sur 60 min par défaut.
 */
function isMissingEventDurationColumn(e: unknown): boolean {
  return (
    e instanceof Prisma.PrismaClientKnownRequestError &&
    e.code === "P2022" &&
    /eventDurationMinutes|BattleTemplate/i.test(
      `${e.message}${JSON.stringify(e.meta ?? {})}`,
    )
  );
}

/** Mutable pour compatibilité avec les types `orderBy` Prisma (pas `readonly[]`). */
const eventsOrderPhases: Prisma.BattleEventDefinitionOrderByWithRelationInput[] = [
  { offsetSeconds: "asc" },
  { orderIndex: "asc" },
];

const eventsForWizard = {
  orderBy: { offsetSeconds: "asc" as const },
  select: {
    offsetSeconds: true,
    title: true,
    phaseType: true,
  },
} as const;

export type TemplateRowForEventsWizard = {
  id: string;
  name: string;
  guildId: string;
  eventDurationMinutes: number;
  events: {
    offsetSeconds: number;
    title: string;
    phaseType: BattlePhaseType;
  }[];
};

export async function fetchBattleTemplatesForEventsWizard(): Promise<
  TemplateRowForEventsWizard[]
> {
  try {
    return await prisma.battleTemplate.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        guildId: true,
        eventDurationMinutes: true,
        events: eventsForWizard,
      },
    });
  } catch (e) {
    if (!isMissingEventDurationColumn(e)) throw e;
    const rows = await prisma.battleTemplate.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        guildId: true,
        events: eventsForWizard,
      },
    });
    return rows.map((r) => ({ ...r, eventDurationMinutes: 60 }));
  }
}

export type TemplateRowForTemplatesPage = {
  id: string;
  name: string;
  description: string | null;
  guildId: string;
  eventDurationMinutes: number;
  isDefault: boolean;
  guild: { id: string };
  events: { offsetSeconds: number; phaseType: BattlePhaseType; title: string }[];
};

export async function fetchBattleTemplatesForTemplatesPage(): Promise<
  TemplateRowForTemplatesPage[]
> {
  const selectWith = {
    id: true,
    name: true,
    description: true,
    guildId: true,
    eventDurationMinutes: true,
    isDefault: true,
    guild: { select: { id: true } },
    events: {
      orderBy: eventsOrderPhases,
      select: { offsetSeconds: true, phaseType: true, title: true },
    },
  };

  try {
    const rows = await prisma.battleTemplate.findMany({
      orderBy: [{ guildId: "asc" }, { name: "asc" }],
      select: selectWith,
    });
    return rows as unknown as TemplateRowForTemplatesPage[];
  } catch (e) {
    if (!isMissingEventDurationColumn(e)) throw e;
    const rows = await prisma.battleTemplate.findMany({
      orderBy: [{ guildId: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        description: true,
        guildId: true,
        isDefault: true,
        guild: { select: { id: true } },
        events: {
          orderBy: eventsOrderPhases,
          select: { offsetSeconds: true, phaseType: true, title: true },
        },
      },
    });
    return rows.map((r) => ({
      ...r,
      eventDurationMinutes: 60,
    })) as unknown as TemplateRowForTemplatesPage[];
  }
}

const selectTemplateForEditBase = {
  id: true,
  name: true,
  description: true,
  guildId: true,
  isDefault: true,
  createdAt: true,
  updatedAt: true,
  events: { orderBy: eventsOrderPhases },
} as const;

export async function fetchBattleTemplateForEdit(id: string) {
  try {
    return await prisma.battleTemplate.findUnique({
      where: { id },
      select: { ...selectTemplateForEditBase, eventDurationMinutes: true },
    });
  } catch (e) {
    if (!isMissingEventDurationColumn(e)) throw e;
    const t = await prisma.battleTemplate.findUnique({
      where: { id },
      select: selectTemplateForEditBase,
    });
    return t ? { ...t, eventDurationMinutes: 60 } : null;
  }
}

const selectTemplateForDetailBase = {
  id: true,
  name: true,
  description: true,
  guildId: true,
  isDefault: true,
  createdAt: true,
  updatedAt: true,
  guild: { select: { discordGuildId: true } },
  events: { orderBy: eventsOrderPhases },
} as const;

export async function fetchBattleTemplateForDetail(id: string) {
  try {
    return await prisma.battleTemplate.findUnique({
      where: { id },
      select: { ...selectTemplateForDetailBase, eventDurationMinutes: true },
    });
  } catch (e) {
    if (!isMissingEventDurationColumn(e)) throw e;
    const t = await prisma.battleTemplate.findUnique({
      where: { id },
      select: selectTemplateForDetailBase,
    });
    return t ? { ...t, eventDurationMinutes: 60 } : null;
  }
}

const selectTemplateForDuplicateBase = {
  guildId: true,
  name: true,
  description: true,
  events: { orderBy: eventsOrderPhases },
} as const;

export async function fetchBattleTemplateForDuplicate(id: string) {
  try {
    return await prisma.battleTemplate.findUnique({
      where: { id },
      select: { ...selectTemplateForDuplicateBase, eventDurationMinutes: true },
    });
  } catch (e) {
    if (!isMissingEventDurationColumn(e)) throw e;
    const t = await prisma.battleTemplate.findUnique({
      where: { id },
      select: selectTemplateForDuplicateBase,
    });
    return t ? { ...t, eventDurationMinutes: 60 } : null;
  }
}
