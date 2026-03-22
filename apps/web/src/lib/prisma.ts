import path from "path";
import { fileURLToPath } from "url";
import { config as loadEnvFile } from "dotenv";
import { PrismaClient } from "@prisma/client";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(__dirname, "../..");
const repoRoot = path.resolve(__dirname, "../../../..");

function ensureDatabaseUrl(): void {
  if (process.env.DATABASE_URL?.trim()) return;

  // Next ne lit que apps/web/.env — beaucoup de configs n’ont que apps/bot/.env
  loadEnvFile({ path: path.join(repoRoot, "apps/bot/.env") });
  loadEnvFile({ path: path.join(repoRoot, ".env") });
  loadEnvFile({ path: path.join(webRoot, ".env.local") });
  loadEnvFile({ path: path.join(webRoot, ".env") });
}

ensureDatabaseUrl();

const databaseUrl = process.env.DATABASE_URL?.trim();
if (!databaseUrl) {
  throw new Error(
    "[kingshot:web] DATABASE_URL est absent. Copie la même URL que le bot dans apps/web/.env " +
      "(voir .env.example), ou assure-toi que apps/bot/.env contient DATABASE_URL pour le fallback.",
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

if (process.env.NODE_ENV === "production") {
  void prisma.$connect().then(
    () => console.log("[kingshot:web] Prisma connecté à PostgreSQL."),
    (err) =>
      console.error("[kingshot:web] Prisma $connect a échoué :", err),
  );
}
