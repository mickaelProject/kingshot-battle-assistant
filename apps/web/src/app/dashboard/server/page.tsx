import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
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
  const t = await getTranslations("server");
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

  const rich = {
    bold: (chunks: ReactNode) => <strong>{chunks}</strong>,
    mono: (chunks: ReactNode) => <code>{chunks}</code>,
    cmd: (chunks: ReactNode) => <code>{chunks}</code>,
  };

  return (
    <div className="dashboard-main">
      <PageHeader title={t("pageTitle")} description={t("pageDesc")} />

      {fromDiscordInstall ? (
        <div className="discord-oauth-return-banner" role="status">
          <strong>{t("oauthTitle")}</strong>
          <p className="muted">{t.rich("oauthBody", rich)}</p>
        </div>
      ) : null}

      {guilds.length === 0 ? (
        <SectionCard title={t("emptyTitle")} subtitle={t("emptySubtitle")}>
          <p className="muted">{t.rich("emptyP1", rich)}</p>
          <p className="muted server-empty-hint">{t.rich("emptyP2", rich)}</p>
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
                    ? t("serverOne")
                    : t("serverN", { n: index + 1 })
                }
              />
            ))}
          </div>
          <SectionCard title={t("roadmapTitle")} subtitle={t("roadmapSubtitle")}>
            <ul className="server-roadmap muted">
              <li>{t("roadmap1")}</li>
              <li>{t("roadmap2")}</li>
            </ul>
          </SectionCard>
        </>
      )}
    </div>
  );
}
