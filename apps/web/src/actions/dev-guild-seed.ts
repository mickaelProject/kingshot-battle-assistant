"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { isDiscordSnowflake } from "@/lib/discord-rest";
import { isAdminDevUi } from "@/lib/is-admin-dev-ui";

export type DevUpsertGuildResult =
  | { ok: true }
  | { ok: false; code: "not_dev" | "invalid_id" | "db_error" };

/**
 * Crée ou met à jour une ligne GuildSettings pour un ID Discord donné.
 * **Uniquement en `next dev`** — refusé en production.
 */
export async function devUpsertDiscordGuild(
  rawGuildId: string,
): Promise<DevUpsertGuildResult> {
  if (!isAdminDevUi()) {
    return { ok: false, code: "not_dev" };
  }

  const discordGuildId = rawGuildId.trim();
  if (!isDiscordSnowflake(discordGuildId)) {
    return { ok: false, code: "invalid_id" };
  }

  try {
    await prisma.guildSettings.upsert({
      where: { discordGuildId },
      create: { discordGuildId },
      update: {},
    });
  } catch (e) {
    console.error("[devUpsertDiscordGuild]", e);
    return { ok: false, code: "db_error" };
  }

  revalidatePath("/dashboard/templates");
  revalidatePath("/dashboard/server");
  revalidatePath("/dashboard/launch");
  revalidatePath("/dashboard/events");
  revalidatePath("/dashboard");
  return { ok: true };
}
