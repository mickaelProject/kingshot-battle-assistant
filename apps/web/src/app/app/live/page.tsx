import Link from "next/link";
import { ClientLiveJoinForm } from "@/components/client-live-join-form";
import { fetchOverviewActiveRun } from "@/lib/overview-active-run";

export const dynamic = "force-dynamic";

export default async function AppLivePage() {
  const activeRun = await fetchOverviewActiveRun();

  return (
    <main className="client-page client-live-page">
      <section className="client-panel">
        <h1>Rejoindre un live</h1>
        <p className="muted">
          Utilisez un identifiant de run, ou rejoignez directement l&apos;event
          actif de l&apos;alliance.
        </p>

        <ClientLiveJoinForm />

        <div className="client-live-actions">
          {activeRun ? (
            <Link href={`/live/${activeRun.id}`} className="public-btn public-btn--ghost">
              Rejoindre le live actuel
            </Link>
          ) : (
            <p className="muted">Aucun live actif pour le moment.</p>
          )}
          <Link href="/app" className="public-btn">
            Retour a l&apos;espace client
          </Link>
        </div>
      </section>
      <footer className="live-war-foot muted">
        <Link href="/app/live" className="text-link">
          Astuce: URL directe /live/{`{runId}`}
        </Link>
      </footer>
    </main>
  );
}
