import { DiscordInviteCta } from "@/components/discord-invite-cta";
import {
  fetchGuildTextChannelOptionsByGuildId,
  hasDiscordBotToken,
} from "@/lib/discord-rest";
import {
  getDiscordBotInviteUrl,
  getDiscordInstallRedirectUri,
} from "@/lib/discord-invite";
import { prisma } from "@/lib/prisma";
import { GuildSettingsCard } from "./guild-settings-card";

export default async function GuildPage() {
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
    <main>
      <h1>Guild settings</h1>
      <p className="muted">
        Choisis un <strong>salon texte</strong> où le bot publie les embeds de
        bataille. L’identifiant Discord est enregistré en base ; le libellé{" "}
        <code>#nom</code> vient de l’API Discord (même bot que l’exécution).
      </p>

      {guilds.length === 0 ? (
        <div className="card">
          <p className="muted">
            Aucune guilde en base. Invitez le bot puis utilisez une commande slash
            (admin Discord) une fois.
          </p>
          <DiscordInviteCta
            inviteUrl={discordInviteUrl}
            installRedirectUri={installRedirectUri}
          />
        </div>
      ) : (
        guilds.map((g) => (
          <GuildSettingsCard
            key={g.id}
            guildId={g.id}
            discordGuildId={g.discordGuildId}
            channels={channelsByGuild.get(g.id) ?? []}
            battleChannelId={g.battleChannelId}
            templates={g.templates}
            defaultTemplateId={g.defaultTemplateId}
            discordConfigured={discordConfigured}
          />
        ))
      )}
    </main>
  );
}
