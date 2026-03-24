import Link from "next/link";
import { PublicTopbar } from "@/components/public-topbar";

const FEATURE_ITEMS = [
  "Generation automatique depuis roster",
  "Timeline intelligente 60 minutes",
  "Diffusion live pour les joueurs",
  "Multi-legions (Legion 1 / Legion 2)",
  "Integration Discord",
];

const EVENTS = [
  { name: "Swordland Showdown", status: "Actif" },
  { name: "KvK Preparation", status: "Bientot" },
  { name: "KvK War", status: "Bientot" },
  { name: "Field Battles", status: "Bientot" },
];

export default function Home() {
  return (
    <div className="public-shell">
      <PublicTopbar />
      <main className="public-page">
        <section className="public-hero">
          <div className="public-social-proof">Utilise par des officiers alliance chaque semaine</div>
          <p className="public-eyebrow">Gaming Command Center SaaS</p>
          <h1>Pilotez vos evenements Kingshot comme un commandant</h1>
          <p className="public-hero__subtitle">
            Generez vos strategies, coordonnez vos joueurs et diffusez les
            instructions en live.
          </p>
          <p className="public-impact">From chaos to coordination in seconds</p>
          <div className="public-hero__actions">
            <Link href="/demo" className="public-btn public-btn--primary">
              Voir une demo
            </Link>
            <Link href="/login" className="public-btn">
              Acceder a l&apos;admin
            </Link>
            <Link href="/app/live" className="public-btn public-btn--ghost">
              Rejoindre un live
            </Link>
          </div>
        </section>

        <section className="public-section">
          <h2>Fonctionnalites cle</h2>
          <div className="public-grid public-grid--features">
            {FEATURE_ITEMS.map((label) => (
              <article key={label} className="public-card">
                <p className="public-card__title">{label}</p>
                <p className="public-card__desc">
                  Concu pour garder la synchronisation alliance, officiers et
                  joueurs sur chaque phase tactique.
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="public-section">
          <h2>Visual Preview</h2>
          <div className="public-preview-grid">
            <article className="public-preview-card">
              <p className="public-preview-card__title">Dashboard control</p>
              <div className="public-preview-mock">
                <span />
                <span />
                <span />
              </div>
            </article>
            <article className="public-preview-card public-preview-card--live">
              <p className="public-preview-card__title">Live mission feed</p>
              <div className="public-preview-mock public-preview-mock--pulse">
                <span />
                <span />
                <span />
              </div>
            </article>
          </div>
        </section>

        <section className="public-section">
          <h2>Events supportes</h2>
          <div className="public-grid public-grid--events">
            {EVENTS.map((event) => (
              <article key={event.name} className="public-card">
                <p className="public-card__title">{event.name}</p>
                <span
                  className={`public-badge${event.status === "Actif" ? " public-badge--ok" : ""}`}
                >
                  {event.status}
                </span>
              </article>
            ))}
          </div>
        </section>

        <section className="public-final-cta">
          <h2>Lancer votre premiere strategie</h2>
          <p>
            Passez du briefing a l&apos;execution live avec un cockpit unique pour
            toute votre alliance.
          </p>
          <Link href="/dashboard" className="public-btn public-btn--primary">
            Ouvrir le dashboard admin
          </Link>
        </section>
      </main>
    </div>
  );
}
