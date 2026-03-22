import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

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
    <div className="client-app-root" data-app-surface="client">
      {children}
    </div>
  );
}
