/**
 * `true` uniquement avec `next dev`. Les indices « dépôt / .env.local / Docker »
 * ne doivent pas apparaître dans les builds de production (`next build` + `next start`).
 */
export function isAdminDevUi(): boolean {
  return process.env.NODE_ENV === "development";
}
