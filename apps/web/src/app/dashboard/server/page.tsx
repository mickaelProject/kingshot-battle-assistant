import {
  fetchGuildTextChannels,
  hasDiscordBotToken,
} from "@/lib/discord-rest";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { ServerSettingsCard } from "@/components/server-settings-card";
import { prisma } from "@/lib/prisma";

export default async function ServerSettingsPage() {
  const guilds = await prisma.guildSettings.findMany({
    orderBy: { discordGuildId: "asc" },
    include: {
      templates: { orderBy: { name: "asc" }, select: { id: true, name: true } },
    },
  });

  const discordConfigured = hasDiscordBotToken();
  const channelsByGuild = new Map<string, { id: string; name: string }[]>();
  for (const g of guilds) {
    const raw = await fetchGuildTextChannels(g.discordGuildId);
    channelsByGuild.set(
      g.id,
      raw.map((c) => ({ id: c.id, name: c.name })),
    );
  }

  return (
    <div className="dashboard-main">
      <PageHeader
        title="Réglages serveur"
        description="Salon des annonces et modèle proposé par défaut — tout ce dont vos officiers ont besoin au quotidien."
      />

      {guilds.length === 0 ? (
        <SectionCard title="Aucun serveur">
          <p className="muted">
            Invite le bot sur ton Discord et utilise une commande slash une fois
            pour créer la fiche serveur.
          </p>
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
