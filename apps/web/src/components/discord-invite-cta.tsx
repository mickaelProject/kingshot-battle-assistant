"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";

/**
 * @param inviteUrl — depuis `getDiscordBotInviteUrl()` côté serveur (ou `null` si non configuré).
 * @param installRedirectUri — depuis `getDiscordInstallRedirectUri` : URL à enregistrer dans Discord → OAuth2 → Redirects.
 */
export function DiscordInviteCta({
  inviteUrl,
  installRedirectUri = null,
  className = "",
}: {
  inviteUrl: string | null;
  installRedirectUri?: string | null;
  className?: string;
}) {
  const t = useTranslations("discordInvite");
  const willRedirectBack = Boolean(inviteUrl && installRedirectUri);
  const showDevHints = process.env.NODE_ENV === "development";
  const richInline = {
    mono: (chunks: ReactNode) => (
      <code className="discord-invite-cta__mono">{chunks}</code>
    ),
    strong: (chunks: ReactNode) => <strong>{chunks}</strong>,
  };

  return (
    <div className={`discord-invite-cta ${className}`.trim()}>
      {inviteUrl ? (
        <a
          href={inviteUrl}
          className="btn btn-primary discord-invite-cta__btn"
          target="_blank"
          rel="noopener noreferrer"
        >
          {t("inviteBtn")}
        </a>
      ) : (
        <p className="form-error discord-invite-cta__missing">
          {t.rich("missingEnv", richInline)}
          {showDevHints ? <> {t.rich("missingEnvDev", richInline)}</> : null}
        </p>
      )}
      {inviteUrl ? (
        <p className="field-hint discord-invite-cta__redirect-note">
          {t.rich("openTabHint", {
            strong: (chunks) => <strong>{chunks}</strong>,
          })}
          {willRedirectBack ? (
            <> {t("oauthExtra")}</>
          ) : (
            <>
              {" "}
              {t.rich("redirectSetup", richInline)}
              {showDevHints ? <> {t.rich("redirectSetupDev", richInline)}</> : null}
            </>
          )}
        </p>
      ) : null}
      {installRedirectUri && inviteUrl ? (
        <p className="muted discord-invite-cta__portal-hint">
          {t.rich("portalHint", {
            strong: (chunks) => <strong>{chunks}</strong>,
          })}{" "}
          <code className="discord-invite-cta__mono">{installRedirectUri}</code>
        </p>
      ) : null}
      <ol className="discord-invite-cta__steps muted">
        <li>{t("step1")}</li>
        <li>
          {t.rich("step2", {
            strong: (chunks) => <strong>{chunks}</strong>,
          })}
        </li>
        <li>{t("step3")}</li>
      </ol>
      <p className="discord-invite-cta__more muted">
        {t.rich("more", {
          link: (chunks) => (
            <Link href="/dashboard/server" className="text-link">
              {chunks}
            </Link>
          ),
        })}
      </p>
    </div>
  );
}
