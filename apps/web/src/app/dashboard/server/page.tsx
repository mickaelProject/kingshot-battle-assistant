import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import { DevGuildLocalShortcut } from "@/components/dev-guild-local-shortcut";
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
import { isAdminDevUi } from "@/lib/is-admin-dev-ui";
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
  let guilds: {
    id: string;
    discordGuildId: string;
    battleChannelId: string | null;
    defaultTemplateId: string | null;
    templates: { id: string; name: string }[];
  }[] = [];
  let channelsByGuild = new Map<string, { id: string; name: string }[]>();
  const discordConfigured = hasDiscordBotToken();
  let dbLoadFailed = false;
  let channelsLoadFailed = false;

  try {
    guilds = await prisma.guildSettings.findMany({
      orderBy: { discordGuildId: "asc" },
      include: {
        templates: { orderBy: { name: "asc" }, select: { id: true, name: true } },
      },
    });
  } catch (error) {
    dbLoadFailed = true;
    console.error("[dashboard/server] guild settings load failed", error);
  }

  if (!dbLoadFailed && guilds.length > 0) {
    try {
      channelsByGuild = await fetchGuildTextChannelOptionsByGuildId(guilds);
    } catch (error) {
      channelsLoadFailed = true;
      console.error("[dashboard/server] channel list load failed", error);
    }
  }

  const rich = {
    bold: (chunks: ReactNode) => <strong>{chunks}</strong>,
    mono: (chunks: ReactNode) => <code>{chunks}</code>,
    cmd: (chunks: ReactNode) => <code>{chunks}</code>,
  };

  const showDevHints = isAdminDevUi();
  const devPrefillGuildId = process.env.DEV_DISCORD_GUILD_ID?.trim() || null;

  return (
    <div className="dashboard-main">
      <PageHeader title={t("pageTitle")} description={t("pageDesc")} />

      {fromDiscordInstall ? (
        <div className="discord-oauth-return-banner" role="status">
          <strong>{t("oauthTitle")}</strong>
          <p className="muted">{t.rich("oauthBody", rich)}</p>
        </div>
      ) : null}

      {dbLoadFailed ? (
        <SectionCard title="Reglages serveur indisponibles" subtitle="Connexion DB impossible">
          <p className="muted">
            L&apos;interface admin ne peut pas recuperer les serveurs pour le moment.
            Verifie la connexion PostgreSQL et recharge cette page.
          </p>
        </SectionCard>
      ) : guilds.length === 0 ? (
        <SectionCard title={t("emptyTitle")} subtitle={t("emptySubtitle")}>
          <p className="muted">{t.rich("emptyP1", rich)}</p>
          {showDevHints ? (
            <div className="server-dev-only-hint muted">
              <p className="server-dev-only-hint__title">{t("emptyDevTitle")}</p>
              <p>{t.rich("emptyDevP1", rich)}</p>
              <p>{t.rich("emptyDevP2", rich)}</p>
            </div>
          ) : null}
          <p className="muted server-empty-hint">{t.rich("emptyP2", rich)}</p>
          <DiscordInviteCta
            inviteUrl={discordInviteUrl}
            installRedirectUri={installRedirectUri}
          />
          {showDevHints ? (
            <DevGuildLocalShortcut prefillGuildId={devPrefillGuildId} />
          ) : null}
        </SectionCard>
      ) : (
        <>
          {channelsLoadFailed ? (
            <SectionCard
              title="Canaux Discord indisponibles"
              subtitle="Serveurs charges, synchronisation channels en echec"
            >
              <p className="muted">
                PostgreSQL est bien accessible. La recuperation des canaux Discord a
                echoue (token/API/reseau). Les reglages restent accessibles.
              </p>
            </SectionCard>
          ) : null}
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
