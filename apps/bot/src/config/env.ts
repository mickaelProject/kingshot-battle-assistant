import { loadBotEnv } from "./load-dotenv.js";

loadBotEnv();

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required environment variable: ${name}`);
  return v;
}

export const env = {
  databaseUrl: requireEnv("DATABASE_URL"),
};
