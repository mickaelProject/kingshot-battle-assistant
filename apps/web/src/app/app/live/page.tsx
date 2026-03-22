import Link from "next/link";
import { notFound } from "next/navigation";
import { LiveWarScreen } from "@/components/live-war-screen";
import { fetchLiveBattlePayload } from "@/lib/live-battle-view";

export const dynamic = "force-dynamic";

export default async function AppLivePage({
  searchParams,
}: {
  searchParams: Promise<{ run?: string; me?: string }>;
}) {
  const sp = await searchParams;
  const runId = sp.run?.trim();
  if (!runId) {
    return (
      <main className="live-war live-war--landing">
        <h1 className="live-war__title">Lien incomplet</h1>
        <p className="muted">
          Ajoutez <code className="roster-code-hint">?run=…</code> (identifiant
          de mission fourni par les officiers).
        </p>
        <p>
          <Link href="/app" className="text-link">
            Retour
          </Link>
        </p>
      </main>
    );
  }

  const payload = await fetchLiveBattlePayload(runId, sp.me?.trim() ?? null);
  if (!payload) notFound();

  return (
    <main className="live-war-page">
      <LiveWarScreen initial={payload} />
      <footer className="live-war-foot muted">
        <Link href="/app" className="text-link">
          Accueil joueur
        </Link>
      </footer>
    </main>
  );
}
