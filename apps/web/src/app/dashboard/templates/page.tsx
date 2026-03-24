import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { TemplateCreationSource } from "@prisma/client";
import { duplicateTemplateAction } from "@/actions/data";
import { DevGuildLocalShortcut } from "@/components/dev-guild-local-shortcut";
import { DiscordInviteCta } from "@/components/discord-invite-cta";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { TemplateMiniTimeline } from "@/components/template-mini-timeline";
import {
  getDiscordBotInviteUrl,
  getDiscordInstallRedirectUri,
} from "@/lib/discord-invite";
import { fetchBattleTemplatesForTemplatesPage } from "@/lib/battle-templates-queries";
import { isAdminDevUi } from "@/lib/is-admin-dev-ui";
import { isPrismaConnectionError } from "@/lib/prisma-connection-error";
import { prisma } from "@/lib/prisma";
import {
  formatDurationHuman,
  templateDurationSeconds,
} from "@/lib/time-human";

export default async function TemplatesPage() {
  const t = await getTranslations("templates");
  const discordInviteUrl = getDiscordBotInviteUrl();
  const installRedirectUri = getDiscordInstallRedirectUri();
  const showDevGuildTool = isAdminDevUi();
  const devPrefillGuildId = process.env.DEV_DISCORD_GUILD_ID?.trim() || null;

  let templates: Awaited<
    ReturnType<typeof fetchBattleTemplatesForTemplatesPage>
  > = [];
  let guilds: { id: string }[] = [];
  let loadFailed = false;
  let loadError: unknown = null;

  try {
    const [tRes, gRes] = await Promise.all([
      fetchBattleTemplatesForTemplatesPage(),
      prisma.guildSettings.findMany({
        select: { id: true },
      }),
    ]);
    templates = tRes;
    guilds = gRes;
  } catch (error) {
    loadFailed = true;
    loadError = error;
    console.error("[dashboard/templates] load failed", error);
  }

  const headerActions = (
    <div className="template-create-split">
      <Link
        href="/dashboard/templates/new/roster"
        className="btn btn-primary template-create-split__featured"
      >
        {t("fromRoster")}
      </Link>
      <Link
        href="/dashboard/templates/new/manual"
        className="btn btn-secondary"
      >
        {t("manual")}
      </Link>
      <Link
        href="/dashboard/templates/new"
        className="btn btn-ghost btn-small template-create-split__more"
      >
        {t("allModes")}
      </Link>
    </div>
  );

  if (loadFailed) {
    const devUi = isAdminDevUi();
    const prismaConn = isPrismaConnectionError(loadError);
    return (
      <div className="dashboard-main templates-dashboard">
        <PageHeader
          title={t("pageTitle")}
          description={t("pageDesc")}
          actions={headerActions}
        />
        <SectionCard
          title="Modèles temporairement indisponibles"
          subtitle={
            prismaConn
              ? "Connexion PostgreSQL impossible"
              : "Erreur de chargement"
          }
        >
          <p className="muted">
            {prismaConn ? (
              <>
                La page ne peut pas joindre la base de données.
                {devUi ? (
                  <>
                    {" "}
                    En local, crée <code>apps/web/.env.local</code> avec une URL
                    Postgres locale (voir <code>apps/web/env.local.example</code>,
                    port Docker <code>5433</code>, et{" "}
                    <code>docs/DEVELOPPEMENT-LOCAL.md</code>
                    ). Lance éventuellement <code>npm run setup:local</code> à la
                    racine pour copier les exemples.
                  </>
                ) : (
                  <>
                    {" "}
                    Vérifiez la variable <code>DATABASE_URL</code> sur votre
                    hébergeur (Vercel, Railway, etc.), le pare-feu et le SSL
                    (<code>?sslmode=require</code> si requis), puis rechargez la
                    page.
                  </>
                )}
              </>
            ) : (
              <>Une erreur inattendue s&apos;est produite lors du chargement.</>
            )}
          </p>
        </SectionCard>
      </div>
    );
  }

  return (
    <div className="dashboard-main templates-dashboard">
      <PageHeader
        title={t("pageTitle")}
        description={t("pageDesc")}
        actions={headerActions}
      />

      {templates.length === 0 ? (
        <SectionCard title={t("emptyTitle")}>
          <p className="muted">
            {t("emptyBody")}{" "}
            {guilds.length === 0 ? <>{t("emptyNoGuild")}</> : null}
          </p>
          {guilds.length === 0 ? (
            <>
              <DiscordInviteCta
                inviteUrl={discordInviteUrl}
                installRedirectUri={installRedirectUri}
              />
              {showDevGuildTool ? (
                <DevGuildLocalShortcut prefillGuildId={devPrefillGuildId} />
              ) : null}
            </>
          ) : null}
          {guilds.length > 0 ? (
            <div className="btn-row" style={{ marginTop: "0.75rem" }}>
              <Link href="/dashboard/templates/new" className="btn btn-secondary">
                {t("create")}
              </Link>
              <Link
                href="/dashboard/templates/new/roster"
                className="btn btn-ghost btn-small"
              >
                {t("fromRosterShort")}
              </Link>
            </div>
          ) : null}
        </SectionCard>
      ) : (
        <div className="template-card-grid template-card-grid--premium">
          {templates.map((tmpl) => {
            const offs = tmpl.events.map((e) => e.offsetSeconds);
            const durationSec = templateDurationSeconds(offs);
            const phaseCount = tmpl.events.length;
            return (
              <article
                key={tmpl.id}
                className="template-card template-card--premium"
              >
                <div className="template-card__head">
                  <h2 className="template-card__title">{tmpl.name}</h2>
                  <div className="template-card__badges">
                    {tmpl.isDefault ? (
                      <span className="badge default">{t("badgeDefault")}</span>
                    ) : null}
                    {tmpl.creationSource ===
                    TemplateCreationSource.ROSTER_GENERATED ? (
                      <span className="badge badge--roster-src">
                        {t("badgeRoster")}
                      </span>
                    ) : null}
                  </div>
                </div>
                <div className="template-card__body">
                  {tmpl.description ? (
                    <p className="template-card__desc muted">{tmpl.description}</p>
                  ) : (
                    <p className="template-card__desc template-card__desc--placeholder muted">
                      {t("noDescription")}
                    </p>
                  )}
                  <div className="template-card__frieze">
                    <span className="template-card__eyebrow">{t("friezeLabel")}</span>
                    <TemplateMiniTimeline events={tmpl.events} />
                  </div>
                </div>
                <dl className="template-card__meta template-card__meta--panel">
                  <div>
                    <dt>{t("metaDuration")}</dt>
                    <dd>{tmpl.eventDurationMinutes} min</dd>
                  </div>
                  <div>
                    <dt>{t("metaPhases")}</dt>
                    <dd>{phaseCount}</dd>
                  </div>
                  <div>
                    <dt>{t("metaAnnounce")}</dt>
                    <dd>~ {formatDurationHuman(durationSec)}</dd>
                  </div>
                </dl>
                <div className="template-card__actions">
                  <Link
                    href={`/dashboard/templates/${tmpl.id}/edit`}
                    className="btn btn-secondary btn-small"
                  >
                    {t("edit")}
                  </Link>
                  <form action={duplicateTemplateAction}>
                    <input type="hidden" name="templateId" value={tmpl.id} />
                    <button type="submit" className="btn btn-ghost btn-small">
                      {t("duplicate")}
                    </button>
                  </form>
                  <Link
                    href={`/dashboard/templates/${tmpl.id}`}
                    className="btn btn-ghost btn-small"
                  >
                    {t("view")}
                  </Link>
                  <Link
                    href={`/dashboard/events?templateId=${tmpl.id}&guildId=${tmpl.guildId}`}
                    className="btn btn-primary btn-small"
                  >
                    {t("launch")}
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
