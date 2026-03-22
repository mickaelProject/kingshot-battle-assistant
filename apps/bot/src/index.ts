import "./config/env.js";
import { Client, Events, GatewayIntentBits, Partials } from "discord.js";
import { discordEnv } from "./config/discord-env.js";
import { commandBodies } from "./discord/command-definitions.js";
import {
  handleAutocomplete,
  handleChatInput,
} from "./interactions/handle-interaction.js";
import {
  startHttpControlServer,
  stopHttpControlServer,
} from "./control/http-control-server.js";
import { prisma } from "./db/prisma.js";
import { processDueManagedEvents } from "./services/managed-event-poller.js";
import { ensureGuildSettings } from "./services/guild-settings-service.js";
import { ReminderScheduler } from "./services/reminder-scheduling-service.js";
import { log } from "./util/log.js";

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
  partials: [Partials.Channel],
});

const scheduler = new ReminderScheduler(client);

const MANAGED_POLL_MS = 15_000;

client.once(Events.ClientReady, async (c) => {
  log.info("bot", "Discord prêt", { user: c.user.tag });
  let synced = 0;
  for (const [, guild] of c.guilds.cache) {
    try {
      await ensureGuildSettings(guild.id);
      synced += 1;
    } catch (e) {
      log.error("bot", "sync guilde au démarrage impossible", {
        discordGuildId: guild.id,
        message: e instanceof Error ? e.message : String(e),
      });
    }
  }
  if (synced > 0) {
    log.info("bot", "guildes synchronisées avec la base", { count: synced });
  }
  await scheduler.hydrateFromDatabase();
  startHttpControlServer(scheduler);
  setInterval(() => {
    void processDueManagedEvents(c, scheduler).catch((err) =>
      log.error("poller", "tick error", {
        message: err instanceof Error ? err.message : String(err),
      }),
    );
  }, MANAGED_POLL_MS);
  void processDueManagedEvents(c, scheduler).catch((err) =>
    log.error("poller", "initial run error", {
      message: err instanceof Error ? err.message : String(err),
    }),
  );
});

client.on(Events.GuildCreate, async (guild) => {
  try {
    await ensureGuildSettings(guild.id);
    log.info("bot", "guilde enregistrée en base", {
      discordGuildId: guild.id,
      name: guild.name,
    });
  } catch (e) {
    log.error("bot", "GuildCreate — enregistrement guilde impossible", {
      discordGuildId: guild.id,
      message: e instanceof Error ? e.message : String(e),
    });
  }
});

client.on(Events.InteractionCreate, async (interaction) => {
  try {
    if (interaction.isAutocomplete()) {
      await handleAutocomplete(interaction);
      return;
    }
    if (interaction.isChatInputCommand()) {
      await handleChatInput(interaction, scheduler);
    }
  } catch (e) {
    log.error("interaction", "handler error", {
      message: e instanceof Error ? e.message : String(e),
    });
  }
});

async function shutdown(signal: string): Promise<void> {
  log.info("bot", `arrêt (${signal})`);
  try {
    await stopHttpControlServer();
  } catch (e) {
    log.warn("control", "fermeture HTTP", {
      message: e instanceof Error ? e.message : String(e),
    });
  }
  try {
    await prisma.$disconnect();
  } catch {
    /* ignore */
  }
  client.destroy();
  process.exit(0);
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));

try {
  await client.login(discordEnv.token);
} catch (e) {
  log.error("bot", "login Discord impossible", {
    message: e instanceof Error ? e.message : String(e),
  });
  process.exit(1);
}

export { client, commandBodies };
