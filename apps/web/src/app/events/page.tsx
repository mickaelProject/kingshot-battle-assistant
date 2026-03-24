import { PublicTopbar } from "@/components/public-topbar";

const EVENT_CARDS = [
  {
    title: "Swordland Showdown",
    description:
      "Format 60 min, 2 legions, controle de batiments et timeline fixe en 7 phases.",
    badge: "Disponible",
    available: true,
    image: "⚔️",
    icons: ["🏰", "🛡️", "🔥"],
  },
  {
    title: "KvK Preparation",
    description:
      "Preparation alliance, logistique, repartition des roles et anticipation des objectifs.",
    badge: "Bientot",
    available: false,
    image: "📦",
    icons: ["🧭", "📋", "🤝"],
  },
  {
    title: "KvK War",
    description:
      "Combat longue duree orientee multi-objectifs avec coordination inter-officiers.",
    badge: "Bientot",
    available: false,
    image: "👑",
    icons: ["⚔️", "🎯", "🧠"],
  },
  {
    title: "Field Battles",
    description:
      "Escarmouches et affrontements terrain avec needs de reaction rapide.",
    badge: "Bientot",
    available: false,
    image: "🏹",
    icons: ["⚡", "🛡️", "🏟️"],
  },
];

export default function EventsPage() {
  return (
    <div className="public-shell">
      <PublicTopbar />
      <main className="public-page">
        <section className="public-hero public-hero--compact">
          <p className="public-eyebrow">Modes de jeu Kingshot</p>
          <h1>Events pris en charge</h1>
          <p className="public-hero__subtitle">
            Une meme experience de pilotage pour les events actuels et les futurs
            modes alliance.
          </p>
        </section>

        <section className="public-section">
          <div className="public-grid public-grid--events-full">
            {EVENT_CARDS.map((event) => (
              <article key={event.title} className="public-card public-card--event">
                <div className="public-event-visual" aria-hidden>
                  {event.image}
                </div>
                <div className="public-card__head">
                  <p className="public-card__title">{event.title}</p>
                  <span
                    className={`public-badge${event.available ? " public-badge--ok" : ""}`}
                  >
                    {event.badge}
                  </span>
                </div>
                <p className="public-card__desc">{event.description}</p>
                <div className="public-event-icons">
                  {event.icons.map((icon) => (
                    <span key={`${event.title}-${icon}`} className="public-event-icon">
                      {icon}
                    </span>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
