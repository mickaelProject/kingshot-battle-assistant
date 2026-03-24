import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { PublicTopbar } from "@/components/public-topbar";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("meta");
  return {
    title: t("playerTitle"),
    description: t("playerDescription"),
  };
}

/**
 * Espace CLIENT (joueurs / officiers en lecture seule).
 * L’admin reste sous /dashboard.
 */
export default function ClientAppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="client-app-root public-shell" data-app-surface="client">
      <PublicTopbar />
      <div className="client-app-wrap">
        <nav className="client-subnav" aria-label="Navigation client">
          <Link href="/app" className="client-subnav__link">
            Accueil
          </Link>
          <Link href="/app/live" className="client-subnav__link">
            Live
          </Link>
          <Link href="/app/events" className="client-subnav__link">
            Events
          </Link>
        </nav>
        {children}
      </div>
    </div>
  );
}
