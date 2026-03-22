"use client";

import Link from "next/link";

/**
 * @param inviteUrl — depuis `getDiscordBotInviteUrl()` côté serveur (ou `null` si non configuré).
 * @param installRedirectUri — depuis `getDiscordInstallRedirectUri()` : URL à enregistrer dans Discord → OAuth2 → Redirects.
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
  const willRedirectBack = Boolean(inviteUrl && installRedirectUri);

  return (
    <div className={`discord-invite-cta ${className}`.trim()}>
      {inviteUrl ? (
        <a
          href={inviteUrl}
          className="btn btn-primary discord-invite-cta__btn"
          target="_blank"
          rel="noopener noreferrer"
        >
          Inviter le bot sur mon serveur Discord
        </a>
      ) : (
        <p className="form-error discord-invite-cta__missing">
          Variable d’environnement <code>DISCORD_CLIENT_ID</code> manquante
          (dans <code>apps/web/.env</code>). Copiez la même valeur que sur le bot
          (fichier application Discord → ID d’application).
        </p>
      )}
      {inviteUrl ? (
        <p className="field-hint discord-invite-cta__redirect-note">
          Le lien s’ouvre dans un <strong>nouvel onglet</strong> pour garder le
          tableau de bord ici. Après « Autoriser », si Discord affiche « Bravo »,
          fermez cet onglet et revenez sur celle-ci.
          {willRedirectBack ? (
            <>
              {" "}
              Si la redirection OAuth est bien configurée, Discord peut aussi
              ouvrir votre tableau de bord dans le nouvel onglet.
            </>
          ) : (
            <>
              {" "}
              Pour une redirection automatique dans le nouvel onglet, définissez{" "}
              <code>DISCORD_INSTALL_REDIRECT_URL</code> ou{" "}
              <code>NEXT_PUBLIC_APP_URL</code> dans <code>apps/web/.env</code> et
              la même URL dans le portail Discord → OAuth2 → Redirects.
            </>
          )}
        </p>
      ) : null}
      {installRedirectUri && inviteUrl ? (
        <p className="muted discord-invite-cta__portal-hint">
          Portail Discord → OAuth2 → <strong>Redirects</strong> : ajoutez exactement{" "}
          <code className="discord-invite-cta__mono">{installRedirectUri}</code>
        </p>
      ) : null}
      <ol className="discord-invite-cta__steps muted">
        <li>
          Dans le nouvel onglet, choisissez votre serveur et validez les
          permissions.
        </li>
        <li>
          Sur Discord, en <strong>administrateur</strong>, utilisez une commande
          slash du bot une fois (ex. <code>/setup channel</code>) pour enregistrer
          votre guilde en base.
        </li>
        <li>
          Si besoin, actualisez la page : le serveur apparaîtra après le slash.
        </li>
      </ol>
      <p className="discord-invite-cta__more muted">
        Ensuite, configurez le salon tactique depuis{" "}
        <Link href="/dashboard/server" className="text-link">
          Serveur
        </Link>
        .
      </p>
    </div>
  );
}
