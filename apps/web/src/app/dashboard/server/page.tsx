import { DiscordInviteCta } from "@/components/discord-invite-cta";
import {
  fetchGuildTextChannelOptionsByGuildId,
  hasDiscordBotToken,
} from "@/lib/discord-rest";
import {
  getDiscordBotInviteUrl,
  getDiscordInstallRedirectUri,
} from "@/lib/discord-invite";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { ServerSettingsCard } from "@/components/server-settings-card";
import { prisma } from "@/lib/prisma";

export default async function ServerSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string; guild_id?: string }>;
}) {
  const sp = await searchParams;
  const fromDiscordInstall = Boolean(sp.code);
  const discordInviteUrl = getDiscordBotInviteUrl();
  const installRedirectUri = getDiscordInstallRedirectUri();
  const guilds = await prisma.guildSettings.findMany({
    orderBy: { discordGuildId: "asc" },
    include: {
      templates: { orderBy: { name: "asc" }, select: { id: true, name: true } },
    },
  });

  const discordConfigured = hasDiscordBotToken();
  const channelsByGuild = await fetchGuildTextChannelOptionsByGuildId(guilds);

  return (
    <div className="dashboard-main">
      <PageHeader
        title="Réglages serveur"
        description="Salon des annonces et modèle proposé par défaut — tout ce dont vos officiers ont besoin au quotidien."
      />

      {fromDiscordInstall ? (
        <div
          className="discord-oauth-return-banner"
          role="status"
        >
          <strong>Bot autorisé sur Discord</strong>
          <p className="muted">
            Si votre serveur n’apparaît pas encore, utilisez une commande slash du
            bot (ex. <code>/setup channel</code>) en tant qu’administrateur Discord,
            puis actualisez cette page.
          </p>
        </div>
      ) : null}

      {guilds.length === 0 ? (
        <SectionCard
          title="Relier votre serveur Discord"
          subtitle="Sans serveur enregistré, les modèles et événements ne peuvent pas cibler un salon."
        >
          <p className="muted">
            Le tableau de bord lit la <strong>même base PostgreSQL</strong> que
            le bot (<code>DATABASE_URL</code> identique dans{" "}
            <code>apps/web/.env</code> et <code>apps/bot/.env</code>). Dès que le
            bot rejoint un serveur (version à jour du code), la guilde est
            enregistrée automatiquement — actualisez cette page.
          </p>
          <p className="muted server-empty-hint">
            Si le serveur n’apparaît toujours pas : redémarrez le processus du
            bot, ou en tant qu’<strong>administrateur Discord</strong> exécutez{" "}
            <code>/setup channel</code> (salon des annonces) une fois, puis
            actualisez. Vérifiez aussi que les commandes slash sont enregistrées
            : <code>npm run commands:register -w @kingshot/bot</code>.
          </p>
          <DiscordInviteCta
            inviteUrl={discordInviteUrl}
            installRedirectUri={installRedirectUri}
          />
        </SectionCard>
      ) : (
        <>
          <div className="server-grid">
            {guilds.map((g, index) => (
              <ServerSettingsCard
                key={g.id}
                guildId={g.id}
                channels={channelsByGuild.get(g.id) ?? []}
                battleChannelId={g.battleChannelId}
                templates={g.templates}
                defaultTemplateId={g.defaultTemplateId}
                discordConfigured={discordConfigured}
                serverLabel={
                  guilds.length === 1
                    ? "Votre serveur Discord"
                    : `Serveur ${index + 1}`
                }
              />
            ))}
          </div>
          <SectionCard
            title="Bientôt"
            subtitle="Fonctions prévues — rien à configurer pour l’instant."
          >
            <ul className="server-roadmap muted">
              <li>Intégration salons vocaux (briefing / coordination)</li>
              <li>Traduction des annonces pour alliances internationales</li>
            </ul>
          </SectionCard>
        </>
      )}
    </div>
  );
}
