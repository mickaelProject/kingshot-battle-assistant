import Link from "next/link";
import { DiscordInviteCta } from "@/components/discord-invite-cta";
import { PageHeader } from "@/components/ui/page-header";
import { PostgresUnavailableCard } from "@/components/postgres-unavailable-card";
import { SectionCard } from "@/components/ui/section-card";
import {
  getDiscordBotInviteUrl,
  getDiscordInstallRedirectUri,
} from "@/lib/discord-invite";
import { tryLoadGuildSettingsAsc } from "@/lib/try-guild-settings";
import { RosterTemplateWizard } from "./roster-wizard";

export default async function NewTemplateFromRosterPage() {
  const discordInviteUrl = getDiscordBotInviteUrl();
  const installRedirectUri = getDiscordInstallRedirectUri();
  const loaded = await tryLoadGuildSettingsAsc();

  if (!loaded.ok) {
    return (
      <div className="dashboard-main">
        <p className="run-detail__back">
          <Link href="/dashboard/templates/new" className="text-link">
            ← Choix du mode
          </Link>
        </p>
        <PageHeader
          title="Créer un modèle depuis le roster"
          description="Assistant dédié : roster, phases et ORBAT Swordland."
        />
        <PostgresUnavailableCard
          backHref="/dashboard/templates/new"
          backLabel="← Choix du mode"
        />
      </div>
    );
  }

  const guilds = loaded.guilds;

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
        <SectionCard
          title="Aucun serveur relié"
          subtitle="Il faut d’abord ajouter le bot sur votre Discord et lancer une commande slash une fois."
        >
          <DiscordInviteCta
            inviteUrl={discordInviteUrl}
            installRedirectUri={installRedirectUri}
          />
        </SectionCard>
      ) : (
        <RosterTemplateWizard guilds={guilds} />
      )}
    </div>
  );
}
