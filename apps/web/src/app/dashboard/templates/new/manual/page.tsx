import Link from "next/link";
import { createTemplateAction } from "@/actions/data";
import { DiscordInviteCta } from "@/components/discord-invite-cta";
import { PageHeader } from "@/components/ui/page-header";
import { PostgresUnavailableCard } from "@/components/postgres-unavailable-card";
import { SectionCard } from "@/components/ui/section-card";
import {
  getDiscordBotInviteUrl,
  getDiscordInstallRedirectUri,
} from "@/lib/discord-invite";
import { tryLoadGuildSettingsAsc } from "@/lib/try-guild-settings";

export default async function NewTemplateManualPage() {
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
          title="Nouveau modèle (manuel)"
          description="Crée un modèle vide pour ta guilde, puis configure les phases dans l’éditeur."
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
        title="Nouveau modèle (manuel)"
        description="Crée un modèle vide pour ta guilde, puis configure les phases dans l’éditeur."
      />

      {guilds.length === 0 ? (
        <SectionCard
          title="Aucun serveur relié"
          subtitle="Même prérequis que pour la génération depuis roster."
        >
          <DiscordInviteCta
            inviteUrl={discordInviteUrl}
            installRedirectUri={installRedirectUri}
          />
        </SectionCard>
      ) : (
        <SectionCard title="Informations">
          <form action={createTemplateAction} className="form-stack">
            <div className="form-field">
              <label htmlFor="guildId">Guilde</label>
              <select id="guildId" name="guildId" required>
                {guilds.map((g) => (
                  <option key={g.id} value={g.id}>
                    Serveur · …{g.discordGuildId.slice(-6)}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label htmlFor="name">Nom du modèle</label>
              <input
                id="name"
                name="name"
                required
                placeholder="Ex. Bataille porte sud"
              />
            </div>
            <div className="form-field">
              <label htmlFor="description">Description interne (optionnel)</label>
              <input
                id="description"
                name="description"
                placeholder="Note pour les officiers"
              />
            </div>
            <div className="form-field">
              <label htmlFor="eventDurationMinutes">
                Durée de l’événement (minutes, in-game)
              </label>
              <input
                id="eventDurationMinutes"
                name="eventDurationMinutes"
                type="number"
                min={1}
                max={1440}
                defaultValue={90}
              />
              <p className="field-hint">
                Temps réel prévu (brief → fin). Les annonces Discord se règlent ensuite
                dans l’éditeur de phases.
              </p>
            </div>
            <button type="submit" className="btn btn-primary">
              Créer et ouvrir l’éditeur
            </button>
          </form>
        </SectionCard>
      )}
    </div>
  );
}
