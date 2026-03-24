import { loadBotEnv } from "./load-dotenv.js";

loadBotEnv();

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required environment variable: ${name}`);
  return v;
}

export const discordEnv = {
  token: requireEnv("DISCORD_TOKEN"),
  clientId: requireEnv("DISCORD_CLIENT_ID"),
  devGuildId: process.env.DISCORD_DEV_GUILD_ID ?? null,
};
