import path from "path";
import { fileURLToPath } from "url";
import { config as loadEnvFile } from "dotenv";
import { PrismaClient } from "@prisma/client";
import { isAdminDevUi } from "./is-admin-dev-ui";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(__dirname, "../..");
const repoRoot = path.resolve(__dirname, "../../../..");

/**
 * Ordre de chargement :
 * 1) `.env` partagés (Railway / prod / valeurs par défaut)
 * 2) `.env.local` (non commité) avec `override` — **priorité dev local**
 *
 * Ainsi tu peux garder une URL cloud dans `apps/web/.env` et surcharger avec
 * PostgreSQL local dans `apps/web/.env.local` sans rien retirer du dépôt.
 */
function ensureDatabaseUrl(): void {
  loadEnvFile({ path: path.join(webRoot, ".env") });
  loadEnvFile({ path: path.join(repoRoot, "apps/bot/.env") });
  loadEnvFile({ path: path.join(repoRoot, ".env") });
  loadEnvFile({
    path: path.join(repoRoot, "apps/bot/.env.local"),
    override: true,
  });
  loadEnvFile({
    path: path.join(webRoot, ".env.local"),
    override: true,
  });
}

ensureDatabaseUrl();

const databaseUrl = process.env.DATABASE_URL?.trim();
if (!databaseUrl) {
  const devHint = isAdminDevUi()
    ? " En développement : créez apps/web/.env.local (npm run setup:local) ou renseignez apps/web/.env."
    : "";
  throw new Error(
    "[kingshot:web] DATABASE_URL est obligatoire et doit être identique à celle du bot." +
      devHint,
  );
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: { db: { url: databaseUrl } },
    log:
      process.env.NODE_ENV === "development"
        ? ["error", "warn"]
        : ["error", "warn"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

void prisma.$connect().then(
  () => {
    if (process.env.NODE_ENV === "production") {
      console.log("[kingshot:web] Prisma connecté à PostgreSQL.");
    }
  },
  (err) => console.error("[kingshot:web] Prisma $connect a échoué :", err),
);
