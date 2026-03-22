import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";

export default function NewTemplateHubPage() {
  return (
    <div className="dashboard-main">
      <p className="run-detail__back">
        <Link href="/dashboard/templates" className="text-link">
          ← Modèles
        </Link>
      </p>
      <PageHeader
        title="Comment créer votre modèle ?"
        description="Deux chemins : importez une liste de joueurs (recommandé) ou construisez tout à la main."
      />

      <div className="template-mode-grid template-mode-grid--hero">
        <SectionCard
          className="template-mode-card template-mode-card--roster"
          title={
            <span className="template-mode-card__title-row">
              Générer depuis un roster
              <span className="badge badge--recommended">Recommandé</span>
            </span>
          }
          subtitle="Nom de l’événement, durée, liste des joueurs avec puissance — le système propose un brouillon d’annonces à ajuster."
        >
          <p className="muted">
            Idéal pour une guerre ou un rallye : moins de saisie, plus de cohérence
            avec votre roster.
          </p>
          <Link
            href="/dashboard/templates/new/roster"
            className="btn btn-primary"
          >
            Créer depuis un roster
          </Link>
        </SectionCard>

        <SectionCard
          title="Manuel"
          subtitle="Partez d’un modèle vide et ajoutez chaque annonce une par une dans l’éditeur."
        >
          <p className="muted">
            Parfait si vous avez déjà le déroulé en tête, sans liste de joueurs.
          </p>
          <Link
            href="/dashboard/templates/new/manual"
            className="btn btn-secondary"
          >
            Créer à la main
          </Link>
        </SectionCard>
      </div>
    </div>
  );
}
