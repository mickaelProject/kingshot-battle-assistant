/**
 * Lien d’invitation OAuth2 du bot (même application que le token bot).
 * Configurez `DISCORD_CLIENT_ID` dans `apps/web/.env` (identique au bot).
 *
 * Redirection après « Autoriser » :
 * - Définissez `DISCORD_INSTALL_REDIRECT_URL` (URL complète, ex. http://localhost:3000/dashboard/server)
 *   **ou** `NEXT_PUBLIC_APP_URL` (on ajoute `/dashboard/server`).
 * - Dans le portail Discord → votre application → OAuth2 → Redirects, ajoutez **exactement** la même URL.
 *
 * Permissions : voir les salons, envoyer des messages, embeds, pièces jointes,
 * historique — suffisant pour les annonces tactiques + commandes slash.
 */
const DEFAULT_PERMISSION_BITS = String(
  1024 + // ViewChannel
    2048 + // SendMessages
    8192 + // ManageMessages (édits / embeds)
    16384 + // EmbedLinks
    32768 + // AttachFiles
    65536, // ReadMessageHistory
);

/**
 * URL de retour après invitation du bot (à enregistrer dans Discord → OAuth2 → Redirects).
 */
export function getDiscordInstallRedirectUri(): string | null {
  const explicit = process.env.DISCORD_INSTALL_REDIRECT_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");
  const base = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "");
  if (base) return `${base}/dashboard/server`;
  return null;
}

export function getDiscordBotInviteUrl(): string | null {
  const id =
    process.env.DISCORD_CLIENT_ID?.trim() ||
    process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID?.trim();
  if (!id) return null;
  const permissions =
    process.env.DISCORD_BOT_INVITE_PERMISSIONS?.trim() ||
    DEFAULT_PERMISSION_BITS;
  const params = new URLSearchParams({
    client_id: id,
    permissions,
    scope: "bot applications.commands",
  });

  const redirectUri = getDiscordInstallRedirectUri();
  if (redirectUri) {
    params.set("response_type", "code");
    params.set("redirect_uri", redirectUri);
  }

  return `https://discord.com/oauth2/authorize?${params.toString()}`;
}
