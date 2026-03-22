import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
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

export default nextConfig;
