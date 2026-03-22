import {
  type BattlePhaseType,
  TemplateCreationSource,
  Prisma,
} from "@prisma/client";
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

function p2022Blob(e: unknown): string {
  if (!(e instanceof Prisma.PrismaClientKnownRequestError)) return "";
  return `${e.message}${JSON.stringify(e.meta ?? {})}`;
}

/** Mutable pour compatibilité avec les types `orderBy` Prisma (pas `readonly[]`). */
const eventsOrderPhases: Prisma.BattleEventDefinitionOrderByWithRelationInput[] = [
  { offsetSeconds: "asc" },
  { timelineScope: "asc" },
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
  creationSource: true,
  eventProductKey: true,
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
