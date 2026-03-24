import Link from "next/link";
import { DemoLiveExperience } from "@/components/demo-live-experience";
import { PublicTopbar } from "@/components/public-topbar";

export default function DemoPage() {
  return (
    <div className="public-shell">
      <PublicTopbar />
      <main className="public-page">
        <DemoLiveExperience />
        <section className="public-final-cta">
          <h2>Passer de la demo a votre alliance</h2>
          <p>Demarrez votre onboarding en moins de 2 minutes.</p>
          <div className="public-hero__actions">
            <Link href="/start" className="public-btn public-btn--primary">
              Commencer l&apos;onboarding
            </Link>
            <Link href="/dashboard" className="public-btn">
              Acceder a l&apos;admin
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
