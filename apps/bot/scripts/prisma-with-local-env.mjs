/**
 * Lance Prisma avec la même règle que le runtime bot :
 * charge apps/bot/.env puis apps/bot/.env.local (override).
 *
 * Usage : node scripts/prisma-with-local-env.mjs migrate dev
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const botRoot = path.resolve(__dirname, "..");

const envPath = path.join(botRoot, ".env");
const localPath = path.join(botRoot, ".env.local");

config({ path: envPath });

if (!fs.existsSync(localPath)) {
  console.warn(
    "[kingshot] Fichier introuvable : apps/bot/.env.local",
  );
  console.warn(
    "→ Copie apps/bot/env.local.example vers apps/bot/.env.local (DATABASE_URL locale).",
  );
  console.warn(
    "Sans .env.local, Prisma utilise seulement .env (souvent Railway) — d’où l’erreur P1001 en local.",
  );
} else {
  config({ path: localPath, override: true });
}

const dbUrl = process.env.DATABASE_URL?.trim();
if (!dbUrl) {
  console.error(
    "[kingshot] DATABASE_URL est vide après chargement de apps/bot/.env et .env.local.",
  );
  console.error(
    "→ Crée le fichier apps/bot/.env.local (copie env.local.example) avec une URL locale,",
  );
  console.error(
    "  ex. postgresql://postgres:postgres@localhost:5433/kingshot?schema=public",
  );
  process.exit(1);
}

try {
  const u = new URL(dbUrl);
  const dbName = u.pathname.replace(/^\//, "").split("?")[0] || "?";
  console.log(
    `[kingshot] Prisma → host=${u.hostname} port=${u.port || "5432"} user=${u.username || "(vide)"} db=${dbName}`,
  );
} catch {
  /* ignore */
}

const prismaArgs = process.argv.slice(2);
if (prismaArgs.length === 0) {
  console.error("Usage: node scripts/prisma-with-local-env.mjs <commande prisma> [...args]");
  console.error("Ex. : node scripts/prisma-with-local-env.mjs migrate dev");
  process.exit(1);
}

const result = spawnSync("npx", ["prisma", ...prismaArgs], {
  cwd: botRoot,
  stdio: "inherit",
  shell: true,
  env: process.env,
});

process.exit(result.status ?? 1);
