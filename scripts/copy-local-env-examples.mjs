/**
 * Copie env.local.example → .env.local (web + bot) si les cibles n'existent pas encore.
 * Ne remplace jamais un fichier existant. Complétez ensuite les secrets Discord à la main.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pairs = [
  ["apps/web/env.local.example", "apps/web/.env.local"],
  ["apps/bot/env.local.example", "apps/bot/.env.local"],
];

for (const [srcRel, destRel] of pairs) {
  const src = path.join(root, srcRel);
  const dest = path.join(root, destRel);
  if (!fs.existsSync(src)) {
    console.warn(`[setup:local] Fichier source manquant : ${srcRel}`);
    continue;
  }
  if (fs.existsSync(dest)) {
    console.log(`[setup:local] Déjà présent, on garde : ${destRel}`);
    continue;
  }
  fs.copyFileSync(src, dest);
  console.log(`[setup:local] Créé ${destRel} ← ${srcRel}`);
}

console.log(
  "[setup:local] Renseignez DISCORD_TOKEN, DISCORD_CLIENT_ID, etc. (voir docs/DEVELOPPEMENT-LOCAL.md).",
);
