import Link from "next/link";
import { OnboardingWizard } from "@/components/onboarding-wizard";
import { PublicTopbar } from "@/components/public-topbar";

export default function StartPage() {
  return (
    <div className="public-shell">
      <PublicTopbar />
      <main className="public-page">
        <OnboardingWizard />
        <section className="public-final-cta">
          <h2>Besoin du mode complet ?</h2>
          <p>Le cockpit admin reste disponible pour le pilotage avance.</p>
          <Link href="/dashboard" className="public-btn">
            Ouvrir l&apos;admin
          </Link>
        </section>
      </main>
    </div>
  );
}
