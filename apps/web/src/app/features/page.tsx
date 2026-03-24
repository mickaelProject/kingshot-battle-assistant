import { PublicTopbar } from "@/components/public-topbar";

const BLOCKS = [
  {
    title: "Creer un plan de bataille",
    description:
      "Centralisez les objectifs, les timings et les priorites dans un plan unique lisible par les officiers.",
  },
  {
    title: "Generer une timeline",
    description:
      "Transformez automatiquement votre roster en timeline operationnelle de 60 minutes, prete a executer.",
  },
  {
    title: "Organiser les legions",
    description:
      "Decoupez facilement les roles Legion 1 / Legion 2 avec des consignes claires et une visibilite immediate.",
  },
  {
    title: "Piloter en live",
    description:
      "Diffusez les instructions en temps reel pour aligner chaque joueur sur les priorites du moment.",
  },
  {
    title: "Synchroniser Discord",
    description:
      "Connectez vos channels pour annoncer chaque phase au bon moment sans micro-gestion manuelle.",
  },
];

export default function FeaturesPage() {
  return (
    <div className="public-shell">
      <PublicTopbar />
      <main className="public-page">
        <section className="public-hero public-hero--compact">
          <p className="public-eyebrow">Features</p>
          <h1>Pourquoi cet outil existe</h1>
          <p className="public-hero__subtitle">
            Les evenements Kingshot demandent precision, cadence et coordination.
            Kingshot Battle Assistant structure tout le cycle de commande.
          </p>
        </section>

        <section className="public-section">
          <h2>Ce que vous pouvez faire</h2>
          <div className="public-grid public-grid--feature-blocks">
            {BLOCKS.map((block) => (
              <article key={block.title} className="public-card public-card--feature">
                <p className="public-card__title">{block.title}</p>
                <p className="public-card__desc">{block.description}</p>
                <div className="public-mini-mock" aria-hidden>
                  <span />
                  <span />
                  <span />
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
