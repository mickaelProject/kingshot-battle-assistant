import Link from "next/link";
import { TemplateCreationSource } from "@prisma/client";
import { duplicateTemplateAction } from "@/actions/data";
import { DiscordInviteCta } from "@/components/discord-invite-cta";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { TemplateMiniTimeline } from "@/components/template-mini-timeline";
import {
  getDiscordBotInviteUrl,
  getDiscordInstallRedirectUri,
} from "@/lib/discord-invite";
import { fetchBattleTemplatesForTemplatesPage } from "@/lib/battle-templates-queries";
import { prisma } from "@/lib/prisma";
import {
  formatDurationHuman,
  templateDurationSeconds,
} from "@/lib/time-human";

export default async function TemplatesPage() {
  const discordInviteUrl = getDiscordBotInviteUrl();
  const installRedirectUri = getDiscordInstallRedirectUri();
  const [templates, guilds] = await Promise.all([
    fetchBattleTemplatesForTemplatesPage(),
    prisma.guildSettings.findMany({
      select: { id: true },
    }),
  ]);

  return (
    <div className="dashboard-main templates-dashboard">
      <PageHeader
        title="Arsenal de modèles"
        description="Scénarios réutilisables : durée terrain, annonces Discord, lancement en un clic."
        actions={
          <div className="template-create-split">
            <Link
              href="/dashboard/templates/new/roster"
              className="btn btn-primary template-create-split__featured"
            >
              Générer depuis un roster
            </Link>
            <Link
              href="/dashboard/templates/new/manual"
              className="btn btn-secondary"
            >
              Manuel
            </Link>
            <Link
              href="/dashboard/templates/new"
              className="btn btn-ghost btn-small template-create-split__more"
            >
              Tous les modes
            </Link>
          </div>
        }
      />

      {templates.length === 0 ? (
        <SectionCard title="Aucun modèle">
          <p className="muted">
            Créez un modèle ou initialisez depuis le bot.{" "}
            {guilds.length === 0 ? (
              <>
                Aucun serveur en base : commencez par inviter le bot (voir
                ci-dessous).
              </>
            ) : null}
          </p>
          {guilds.length === 0 ? (
            <DiscordInviteCta
              inviteUrl={discordInviteUrl}
              installRedirectUri={installRedirectUri}
            />
          ) : null}
          {guilds.length > 0 ? (
            <div className="btn-row" style={{ marginTop: "0.75rem" }}>
              <Link href="/dashboard/templates/new" className="btn btn-secondary">
                Créer un modèle
              </Link>
              <Link
                href="/dashboard/templates/new/roster"
                className="btn btn-ghost btn-small"
              >
                Depuis un roster
              </Link>
            </div>
          ) : null}
        </SectionCard>
      ) : (
        <div className="template-card-grid template-card-grid--premium">
          {templates.map((t) => {
            const offs = t.events.map((e) => e.offsetSeconds);
            const durationSec = templateDurationSeconds(offs);
            const phaseCount = t.events.length;
            return (
              <article key={t.id} className="template-card template-card--premium">
                <div className="template-card__head">
                  <h2 className="template-card__title">{t.name}</h2>
                  <div className="template-card__badges">
                    {t.isDefault ? (
                      <span className="badge default">Par défaut</span>
                    ) : null}
                    {t.creationSource ===
                    TemplateCreationSource.ROSTER_GENERATED ? (
                      <span className="badge badge--roster-src">
                        Depuis roster
                      </span>
                    ) : null}
                  </div>
                </div>
                {t.description ? (
                  <p className="template-card__desc muted">{t.description}</p>
                ) : (
                  <p className="template-card__desc muted">Sans description</p>
                )}
                <TemplateMiniTimeline events={t.events} />
                <dl className="template-card__meta">
                  <div>
                    <dt>Durée bataille</dt>
                    <dd>{t.eventDurationMinutes} min</dd>
                  </div>
                  <div>
                    <dt>Phases</dt>
                    <dd>{phaseCount}</dd>
                  </div>
                  <div>
                    <dt>Annonces sur</dt>
                    <dd>~ {formatDurationHuman(durationSec)}</dd>
                  </div>
                </dl>
                <div className="template-card__actions">
                  <Link
                    href={`/dashboard/templates/${t.id}/edit`}
                    className="btn btn-secondary btn-small"
                  >
                    Modifier
                  </Link>
                  <form action={duplicateTemplateAction}>
                    <input type="hidden" name="templateId" value={t.id} />
                    <button type="submit" className="btn btn-ghost btn-small">
                      Dupliquer
                    </button>
                  </form>
                  <Link
                    href={`/dashboard/templates/${t.id}`}
                    className="btn btn-ghost btn-small"
                  >
                    Voir
                  </Link>
                  <Link
                    href={`/dashboard/events?templateId=${t.id}&guildId=${t.guildId}`}
                    className="btn btn-primary btn-small"
                  >
                    Lancer
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
