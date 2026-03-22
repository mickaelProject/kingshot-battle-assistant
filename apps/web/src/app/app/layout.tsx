import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mission · Kingshot",
  description:
    "Vue joueur : objectifs, consignes et compte à rebours — sans édition.",
};

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
