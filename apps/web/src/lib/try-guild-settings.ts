import { prisma } from "@/lib/prisma";
import { isPrismaConnectionError } from "@/lib/prisma-connection-error";

export type GuildSettingsAscRow = {
  id: string;
  discordGuildId: string;
};

/**
 * Charge les guildes pour les formulaires (roster, modèle manuel, etc.).
 * Ne propage pas les erreurs de connexion DB : l’UI affiche une carte d’aide.
 */
export async function tryLoadGuildSettingsAsc(): Promise<
  | { ok: true; guilds: GuildSettingsAscRow[] }
  | { ok: false; connectionFailed: true }
> {
  try {
    const guilds = await prisma.guildSettings.findMany({
      orderBy: { discordGuildId: "asc" },
    });
    return { ok: true, guilds };
  } catch (e) {
    if (isPrismaConnectionError(e)) {
      console.error("[kingshot:web] guildSettings.findMany (asc) failed", e);
      return { ok: false, connectionFailed: true };
    }
    throw e;
  }
}
