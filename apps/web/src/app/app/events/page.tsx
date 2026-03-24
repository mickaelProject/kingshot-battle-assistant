import Link from "next/link";
import { ManagedEventStatus } from "@prisma/client";
import { EmptyState } from "@/components/ui/empty-state";
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

export default async function ClientEventsPage() {
  const runs = await prisma.managedEventRun.findMany({
    orderBy: { scheduledAt: "desc" },
    take: 20,
    select: {
      id: true,
      status: true,
      scheduledAt: true,
      template: { select: { name: true, eventDurationMinutes: true } },
    },
  });

  return (
    <main className="client-page">
      <section className="client-hero-card">
        <p className="public-eyebrow">Events alliance</p>
        <h1>Historique et planning</h1>
      </section>

      {runs.length === 0 ? (
        <EmptyState
          title="Aucun event disponible"
          description="Les runs planifies ou executes apparaitront ici."
        />
      ) : (
        <section className="client-grid client-grid--events">
          {runs.map((run) => (
            <article key={run.id} className="client-panel">
              <h2>{run.template.name}</h2>
              <p className="muted">Duree: {run.template.eventDurationMinutes} min</p>
              <p className="muted">Statut: {statusLabel(run.status)}</p>
              <div className="client-actions">
                <Link href={`/live/${run.id}`} className="public-btn public-btn--ghost">
                  Voir
                </Link>
              </div>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}
