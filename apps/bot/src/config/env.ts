import { normalizePostgresUrlForCloud } from "@kingshot/shared";
import { loadBotEnv } from "./load-dotenv.js";

loadBotEnv();

/** Railway / Neon : sslmode=require si absent (aligné sur l’app web). */
function applyNormalizedDatabaseUrl(): void {
  const raw = process.env.DATABASE_URL?.trim();
  if (!raw) return;
  const next = normalizePostgresUrlForCloud(raw);
  if (next !== raw) process.env.DATABASE_URL = next;
}
applyNormalizedDatabaseUrl();

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required environment variable: ${name}`);
  return v;
}

export const env = {
  databaseUrl: requireEnv("DATABASE_URL"),
};
