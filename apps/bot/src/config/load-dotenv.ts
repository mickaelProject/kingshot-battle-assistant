import { config } from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

/** Racine `apps/bot` (pour résoudre `.env` / `.env.local`). */
const botRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
);

/**
 * Charge la config locale sans écraser les variables déjà posées par l’hébergeur,
 * puis applique `.env.local` par-dessus (priorité dev machine).
 */
export function loadBotEnv(): void {
  config({ path: path.join(botRoot, ".env") });
  config({ path: path.join(botRoot, ".env.local"), override: true });
}
