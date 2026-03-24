import Link from "next/link";
import { ManagedEventStatus } from "@prisma/client";
import { EmptyState } from "@/components/ui/empty-state";
import { fetchOverviewActiveRun } from "@/lib/overview-active-run";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function statusLabel(status: ManagedEventStatus) {
  switch (status) {
    case ManagedEventStatus.ACTIVE:
    case ManagedEventStatus.STARTING:
      return "En cours";
    case ManagedEventStatus.SCHEDULED:
      return "Planifie";
    case ManagedEventStatus.COMPLETED:
      return "Termine";
    case ManagedEventStatus.CANCELLED:
      return "Annule";
    case ManagedEventStatus.FAILED:
      return "Echoue";
    default:
      return status;
  }
}

export default async function ClientAppHomePage() {
  const [activeRun, nextRun, guild, playerCount] = await Promise.all([
    fetchOverviewActiveRun(),
    prisma.managedEventRun.findFirst({
      where: { status: ManagedEventStatus.SCHEDULED },
      orderBy: { scheduledAt: "asc" },
      select: {
        id: true,
        scheduledAt: true,
        status: true,
        template: { select: { name: true, eventDurationMinutes: true } },
      },
    }),
    prisma.guildSettings.findFirst({
      orderBy: { createdAt: "asc" },
      select: { id: true, discordGuildId: true },
    }),
    prisma.playerAssignment.count({ where: { sessionId: null } }),
  ]);

  const personalAssignment = activeRun?.session?.id
    ? await prisma.playerAssignment.findFirst({
        where: { sessionId: activeRun.session.id },
        select: {
          slotLabel: true,
          legionIndex: true,
          buildingKey: true,
          side: true,
          leaderName: true,
        },
      })
    : null;

  const currentDuration = activeRun?.template.eventDurationMinutes ?? 60;
  const nextDate = nextRun ? new Date(nextRun.scheduledAt).toLocaleString("fr-FR") : null;

  return (
    <main className="client-page">
      <section className="client-hero-card">
        <p className="public-eyebrow">Espace alliance</p>
        <h1>Centre de pilotage simplifie</h1>
        <p className="muted">
          Lecture et acces rapide uniquement. La gestion avancee reste dans
          l&apos;espace admin.
        </p>
      </section>

      <section className="client-grid">
        <article className="client-panel">
          <h2>Event en cours</h2>
          {activeRun ? (
            <>
              <p className="client-panel__value">{activeRun.template.name}</p>
              <p className="muted">Timer: {currentDuration} min</p>
              <Link href={`/live/${activeRun.id}`} className="public-btn public-btn--primary">
                Rejoindre le live
              </Link>
            </>
          ) : (
            <EmptyState
              title="Aucun event actif"
              description="Lancez ou planifiez un run depuis l'admin."
            />
          )}
        </article>

        <article className="client-panel">
          <h2>Prochain event</h2>
          {nextRun ? (
            <>
              <p className="client-panel__value">{nextRun.template.name || "Swordland"}</p>
              <p className="muted">Date: {nextDate}</p>
              <p className="muted">Statut: {statusLabel(nextRun.status)}</p>
            </>
          ) : (
            <EmptyState title="Aucun event planifie" />
          )}
        </article>

        <article className="client-panel">
          <h2>Acces rapide</h2>
          <div className="client-actions">
            <Link href="/app/live" className="public-btn public-btn--primary">
              Ouvrir live
            </Link>
            <Link
              href={activeRun ? `/dashboard/runs/${activeRun.id}` : "/dashboard/runs"}
              className="public-btn"
            >
              Voir strategie
            </Link>
          </div>
        </article>

        <article className="client-panel">
          <h2>Infos alliance</h2>
          <p className="client-panel__value">{playerCount} joueurs assignes</p>
          <p className="muted">Legions: 2</p>
          <p className="muted">Serveur: {guild?.discordGuildId ?? "Non configure"}</p>
        </article>

        <article className="client-panel">
          <h2>Ton role</h2>
          <p className="client-panel__value">{personalAssignment?.slotLabel ?? "Non assigne"}</p>
          <p className="muted">Leader: {personalAssignment?.leaderName ?? "A definir"}</p>
        </article>

        <article className="client-panel">
          <h2>Ta legion</h2>
          <p className="client-panel__value">
            {personalAssignment?.legionIndex ? `Legion ${personalAssignment.legionIndex}` : "Aucune"}
          </p>
          <p className="muted">Side: {personalAssignment?.side ?? "Non defini"}</p>
        </article>

        <article className="client-panel">
          <h2>Tes objectifs</h2>
          <p className="client-panel__value">
            {personalAssignment?.buildingKey ?? "En attente de briefing"}
          </p>
          <p className="muted">
            {activeRun ? "Objectifs extraits du run en cours." : "Aucun run actif."}
          </p>
        </article>
      </section>
    </main>
  );
}
