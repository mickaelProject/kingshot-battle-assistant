import { ManagedEventStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/** Include léger : évite un include profond (plus robuste selon versions Prisma / bundlers). */
const activeRunInclude = {
  guild: { select: { discordGuildId: true } },
  template: {
    select: {
      name: true,
      eventDurationMinutes: true,
      _count: { select: { events: true } },
    },
  },
  session: true,
} satisfies Prisma.ManagedEventRunInclude;

export type OverviewActiveRun = Prisma.ManagedEventRunGetPayload<{
  include: typeof activeRunInclude;
}> & {
  session: (NonNullable<
    Prisma.ManagedEventRunGetPayload<{
      include: typeof activeRunInclude;
    }>["session"]
  > & {
    reminders: Prisma.BattleReminderGetPayload<{
      select: {
        status: true;
        title: true;
        phaseType: true;
        scheduledAt: true;
      };
    }>[];
  }) | null;
};

const reminderSelect = {
  status: true,
  title: true,
  phaseType: true,
  scheduledAt: true,
} as const;

/**
 * Run « en direct » pour la vue d’accueil (ACTIVE + STARTING).
 * Repli sur ACTIVE seul si le client Prisma n’a pas encore l’enum STARTING (génération oubliée).
 */
export async function fetchOverviewActiveRun(): Promise<OverviewActiveRun | null> {
  const baseQuery = {
    orderBy: { updatedAt: "desc" as const },
    include: activeRunInclude,
  };

  let base: Prisma.ManagedEventRunGetPayload<{
    include: typeof activeRunInclude;
  }> | null = null;

  try {
    base = await prisma.managedEventRun.findFirst({
      ...baseQuery,
      where: {
        status: {
          in: [ManagedEventStatus.ACTIVE, ManagedEventStatus.STARTING],
        },
      },
    });
  } catch (e) {
    const looksLikeStartingEnum =
      e instanceof Prisma.PrismaClientValidationError &&
      /STARTING/i.test(e.message);
    if (looksLikeStartingEnum) {
      base = await prisma.managedEventRun.findFirst({
        ...baseQuery,
        where: { status: ManagedEventStatus.ACTIVE },
      });
    } else {
      throw e;
    }
  }

  if (!base) return null;

  const reminders =
    base.session != null
      ? await prisma.battleReminder.findMany({
          where: { sessionId: base.session.id },
          orderBy: { scheduledAt: "asc" },
          take: 200,
          select: reminderSelect,
        })
      : [];

  return {
    ...base,
    session: base.session
      ? { ...base.session, reminders }
      : null,
  } as OverviewActiveRun;
}
