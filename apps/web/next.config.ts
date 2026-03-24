import path from "path";
import { fileURLToPath } from "url";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin();

/** Racine du monorepo (évite l’avertissement multi lockfile / tracing). */
const monorepoRoot = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
);

const nextConfig: NextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: monorepoRoot,
  async redirects() {
    return [
      {
        source: "/dashboard/guild",
        destination: "/dashboard/server",
        permanent: false,
      },
      {
        source: "/dashboard/launch",
        destination: "/dashboard/events",
        permanent: false,
      },
      {
        source: "/dashboard/templates/new/strategy",
        destination: "/dashboard/templates/new/roster",
        permanent: false,
      },
    ];
  },
};

export default withNextIntl(nextConfig);
