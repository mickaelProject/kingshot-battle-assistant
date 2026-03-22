import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { prisma } from "@/lib/prisma";
import { RosterTemplateWizard } from "./roster-wizard";

export default async function NewTemplateFromRosterPage() {
  const guilds = await prisma.guildSettings.findMany({
    orderBy: { discordGuildId: "asc" },
  });

  return (
    <div className="dashboard-main">
      <p className="run-detail__back">
        <Link href="/dashboard/templates/new" className="text-link">
          ← Choix du mode
        </Link>
      </p>
      <PageHeader
        title="Créer un modèle depuis le roster"
        description="Assistant dédié : nom, type d’événement, durée in-game, roster (nom + puissance), notes optionnelles. Aperçu des joueurs et des annonces Discord avant création du brouillon éditable."
      />

      {guilds.length === 0 ? (
        <SectionCard title="Aucune guilde">
          <p className="muted">
            Invite le bot et utilise un slash une fois pour enregistrer ton serveur.
          </p>
        </SectionCard>
      ) : (
        <RosterTemplateWizard guilds={guilds} />
      )}
    </div>
  );
}
