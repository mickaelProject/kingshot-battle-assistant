import {
  fetchGuildTextChannels,
  hasDiscordBotToken,
} from "@/lib/discord-rest";
import { prisma } from "@/lib/prisma";
import { GuildSettingsCard } from "./guild-settings-card";

export default async function GuildPage() {
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
    <main>
      <h1>Guild settings</h1>
      <p className="muted">
        Choisis un <strong>salon texte</strong> où le bot publie les embeds de
        bataille. L’identifiant Discord est enregistré en base ; le libellé{" "}
        <code>#nom</code> vient de l’API Discord (même bot que l’exécution).
      </p>

      {guilds.length === 0 ? (
        <div className="card">
          <p>No guilds. Invite the bot and run a slash command once.</p>
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
