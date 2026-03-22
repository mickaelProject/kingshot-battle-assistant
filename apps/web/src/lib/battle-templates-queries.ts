import {
  type BattlePhaseType,
  TemplateCreationSource,
  type TimelineScope,
  Prisma,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Si la migration `20260322140000_template_event_duration` n’a pas été appliquée,
 * PostgreSQL renvoie P2022 sur `eventDurationMinutes`. On retombe sur 60 min par défaut.
 */
function p2022Blob(e: unknown): string {
  if (!(e instanceof Prisma.PrismaClientKnownRequestError)) return "";
  return `${e.message}${JSON.stringify(e.meta ?? {})}`;
}

function isMissingEventDurationColumn(e: unknown): boolean {
  return (
    e instanceof Prisma.PrismaClientKnownRequestError &&
    e.code === "P2022" &&
    /eventDurationMinutes|BattleTemplate/i.test(
      `${e.message}${JSON.stringify(e.meta ?? {})}`,
    )
  );
}

function isMissingTemplateLegionOffsetColumns(e: unknown): boolean {
  return (
    e instanceof Prisma.PrismaClientKnownRequestError &&
    e.code === "P2022" &&
    /legion1StartOffsetMinutes|BattleTemplate/i.test(p2022Blob(e))
  );
}

/** Mutable pour compatibilité avec les types `orderBy` Prisma (pas `readonly[]`). */
const eventsOrderPhases: Prisma.BattleEventDefinitionOrderByWithRelationInput[] = [
  { offsetSeconds: "asc" },
  { timelineScope: "asc" },
  { orderIndex: "asc" },
];

const eventsSelectForWizard: Prisma.BattleTemplate$eventsArgs = {
  orderBy: [
    { offsetSeconds: "asc" },
    { orderIndex: "asc" },
  ],
  select: {
    offsetSeconds: true,
    title: true,
    phaseType: true,
    timelineScope: true,
  },
};

export type TemplateRowForEventsWizard = {
  id: string;
  name: string;
  guildId: string;
  eventDurationMinutes: number;
  legion1StartOffsetMinutes: number;
  legion2StartOffsetMinutes: number;
  events: {
    offsetSeconds: number;
    title: string;
    phaseType: BattlePhaseType;
    timelineScope: TimelineScope;
  }[];
};

export async function fetchBattleTemplatesForEventsWizard(): Promise<
  TemplateRowForEventsWizard[]
> {
  let templateLegionOffsets = true;
  let templateEventDuration = true;

  for (let attempt = 0; attempt < 8; attempt++) {
    try {
      const rows = await prisma.battleTemplate.findMany({
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          guildId: true,
          ...(templateEventDuration ? { eventDurationMinutes: true } : {}),
          ...(templateLegionOffsets
            ? {
                legion1StartOffsetMinutes: true,
                legion2StartOffsetMinutes: true,
              }
            : {}),
          events: eventsSelectForWizard,
        },
      });
      return rows.map((r) => ({
        ...r,
        eventDurationMinutes: r.eventDurationMinutes ?? 60,
        legion1StartOffsetMinutes: r.legion1StartOffsetMinutes ?? 0,
        legion2StartOffsetMinutes: r.legion2StartOffsetMinutes ?? 0,
        events: r.events,
      }));
    } catch (e) {
      if (!(e instanceof Prisma.PrismaClientKnownRequestError)) throw e;
      if (e.code !== "P2022") throw e;
      if (isMissingTemplateLegionOffsetColumns(e)) {
        templateLegionOffsets = false;
        continue;
      }
      if (isMissingEventDurationColumn(e)) {
        templateEventDuration = false;
        continue;
      }
      throw e;
    }
  }
  throw new Error(
    "[kingshot] Impossible de charger les modèles pour le lancement : schéma base incompatible.",
  );
}

export type TemplateRowForTemplatesPage = {
  id: string;
  name: string;
  description: string | null;
  guildId: string;
  eventDurationMinutes: number;
  isDefault: boolean;
  creationSource: TemplateCreationSource;
  guild: { id: string };
  events: { offsetSeconds: number; phaseType: BattlePhaseType; title: string }[];
};

function buildTemplatesListSelect(flags: {
  eventDurationMinutes: boolean;
  creationSource: boolean;
}): Prisma.BattleTemplateSelect {
  return {
    id: true,
    name: true,
    description: true,
    guildId: true,
    isDefault: true,
    ...(flags.eventDurationMinutes ? { eventDurationMinutes: true } : {}),
    ...(flags.creationSource ? { creationSource: true } : {}),
    guild: { select: { id: true } },
    events: {
      orderBy: eventsOrderPhases,
      select: { offsetSeconds: true, phaseType: true, title: true },
    },
  };
}

export async function fetchBattleTemplatesForTemplatesPage(): Promise<
  TemplateRowForTemplatesPage[]
> {
  let eventDurationMinutes = true;
  let creationSource = true;

  for (let attempt = 0; attempt < 12; attempt++) {
    try {
      const rows = await prisma.battleTemplate.findMany({
        orderBy: [{ guildId: "asc" }, { name: "asc" }],
        select: buildTemplatesListSelect({
          eventDurationMinutes,
          creationSource,
        }),
      });
      return rows.map((r) => {
        const rec = r as Record<string, unknown>;
        return {
          ...r,
          eventDurationMinutes:
            typeof rec.eventDurationMinutes === "number"
              ? rec.eventDurationMinutes
              : 60,
          creationSource:
            rec.creationSource === TemplateCreationSource.ROSTER_GENERATED ||
            rec.creationSource === TemplateCreationSource.MANUAL
              ? (rec.creationSource as TemplateCreationSource)
              : TemplateCreationSource.MANUAL,
        };
      }) as TemplateRowForTemplatesPage[];
    } catch (e) {
      if (!(e instanceof Prisma.PrismaClientKnownRequestError)) throw e;
      if (e.code !== "P2022") throw e;
      const blob = p2022Blob(e);
      if (/creationSource/i.test(blob)) {
        creationSource = false;
        continue;
      }
      if (/eventDurationMinutes/i.test(blob)) {
        eventDurationMinutes = false;
        continue;
      }
      if (isMissingEventDurationColumn(e)) {
        eventDurationMinutes = false;
        continue;
      }
      throw e;
    }
  }
  throw new Error(
    "[kingshot] Impossible de charger les modèles : migrations Prisma incomplètes.",
  );
}

const selectTemplateForEditBase = {
  id: true,
  name: true,
  description: true,
  guildId: true,
  isDefault: true,
  createdAt: true,
  updatedAt: true,
  eventProductKey: true,
  events: { orderBy: eventsOrderPhases },
} as const;

function isMissingLegionOffsetColumns(e: unknown): boolean {
  return (
    e instanceof Prisma.PrismaClientKnownRequestError &&
    e.code === "P2022" &&
    /legion[12]StartOffsetMinutes/i.test(p2022Blob(e))
  );
}

export async function fetchBattleTemplateForEdit(id: string) {
  try {
    return await prisma.battleTemplate.findUnique({
      where: { id },
      select: {
        ...selectTemplateForEditBase,
        eventDurationMinutes: true,
        legion1StartOffsetMinutes: true,
        legion2StartOffsetMinutes: true,
      },
    });
  } catch (e) {
    if (isMissingEventDurationColumn(e)) {
      try {
        const t = await prisma.battleTemplate.findUnique({
          where: { id },
          select: {
            ...selectTemplateForEditBase,
            legion1StartOffsetMinutes: true,
            legion2StartOffsetMinutes: true,
          },
        });
        return t
          ? {
              ...t,
              eventDurationMinutes: 60,
            }
          : null;
      } catch (e2) {
        if (isMissingLegionOffsetColumns(e2)) {
          const t = await prisma.battleTemplate.findUnique({
            where: { id },
            select: selectTemplateForEditBase,
          });
          return t
            ? {
                ...t,
                eventDurationMinutes: 60,
                legion1StartOffsetMinutes: 0,
                legion2StartOffsetMinutes: 0,
              }
            : null;
        }
        throw e2;
      }
    }
    if (isMissingLegionOffsetColumns(e)) {
      try {
        const t = await prisma.battleTemplate.findUnique({
          where: { id },
          select: {
            ...selectTemplateForEditBase,
            eventDurationMinutes: true,
          },
        });
        return t
          ? {
              ...t,
              legion1StartOffsetMinutes: 0,
              legion2StartOffsetMinutes: 0,
            }
          : null;
      } catch (e2) {
        if (!isMissingEventDurationColumn(e2)) throw e2;
        const t = await prisma.battleTemplate.findUnique({
          where: { id },
          select: selectTemplateForEditBase,
        });
        return t
          ? {
              ...t,
              eventDurationMinutes: 60,
              legion1StartOffsetMinutes: 0,
              legion2StartOffsetMinutes: 0,
            }
          : null;
      }
    }
    throw e;
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
  creationSource: true,
  eventProductKey: true,
  events: { orderBy: eventsOrderPhases },
} as const;

export async function fetchBattleTemplateForDuplicate(id: string) {
  try {
    return await prisma.battleTemplate.findUnique({
      where: { id },
      select: {
        ...selectTemplateForDuplicateBase,
        eventDurationMinutes: true,
        legion1StartOffsetMinutes: true,
        legion2StartOffsetMinutes: true,
      },
    });
  } catch (e) {
    if (isMissingEventDurationColumn(e)) {
      try {
        const t = await prisma.battleTemplate.findUnique({
          where: { id },
          select: {
            ...selectTemplateForDuplicateBase,
            legion1StartOffsetMinutes: true,
            legion2StartOffsetMinutes: true,
          },
        });
        return t
          ? { ...t, eventDurationMinutes: 60 }
          : null;
      } catch (e2) {
        if (isMissingLegionOffsetColumns(e2)) {
          const t = await prisma.battleTemplate.findUnique({
            where: { id },
            select: selectTemplateForDuplicateBase,
          });
          return t
            ? {
                ...t,
                eventDurationMinutes: 60,
                legion1StartOffsetMinutes: 0,
                legion2StartOffsetMinutes: 0,
              }
            : null;
        }
        throw e2;
      }
    }
    if (isMissingLegionOffsetColumns(e)) {
      const t = await prisma.battleTemplate.findUnique({
        where: { id },
        select: { ...selectTemplateForDuplicateBase, eventDurationMinutes: true },
      });
      return t
        ? {
            ...t,
            legion1StartOffsetMinutes: 0,
            legion2StartOffsetMinutes: 0,
          }
        : null;
    }
    throw e;
  }
}
