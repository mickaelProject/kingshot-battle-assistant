/**
 * Complète l’URL PostgreSQL pour les hébergeurs cloud (Railway, Neon, etc.)
 * quand `sslmode` manque — cause fréquente de P1001 / erreurs Prisma.
 */
export function normalizePostgresUrlForCloud(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return trimmed;
  try {
    const u = new URL(trimmed);
    const host = u.hostname.toLowerCase();
    const likelyRequiresSsl =
      host.includes("railway.app") ||
      host.includes("rlwy.net") ||
      host.includes("neon.tech") ||
      host.endsWith(".supabase.co") ||
      host.includes("render.com") ||
      host.includes("cockroachlabs.cloud") ||
      host.includes("aws.amazon.com") ||
      host.includes("azure.com");

    if (likelyRequiresSsl && !u.searchParams.has("sslmode")) {
      u.searchParams.set("sslmode", "require");
    }
    if (!u.searchParams.has("schema")) {
      u.searchParams.set("schema", "public");
    }
    if (likelyRequiresSsl && !u.searchParams.has("connect_timeout")) {
      u.searchParams.set("connect_timeout", "60");
    }
    return u.toString();
  } catch {
    return trimmed;
  }
}
