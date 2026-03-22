"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  {
    href: "/dashboard",
    label: "Vue d’ensemble",
    short: "Overview",
    live: false,
    match: (p: string) => p === "/dashboard",
  },
  {
    href: "/dashboard/events",
    label: "Événements",
    short: "Events",
    live: false,
    match: (p: string) => p.startsWith("/dashboard/events"),
  },
  {
    href: "/dashboard/templates",
    label: "Modèles",
    short: "Templates",
    live: false,
    match: (p: string) => p.startsWith("/dashboard/templates"),
  },
  {
    href: "/dashboard/runs",
    label: "Exécutions",
    short: "Runs",
    live: true,
    match: (p: string) => p.startsWith("/dashboard/runs"),
  },
  {
    href: "/dashboard/server",
    label: "Serveur",
    short: "Server",
    live: false,
    match: (p: string) => p.startsWith("/dashboard/server"),
  },
] as const;

export function DashboardSidebar() {
  const pathname = usePathname() ?? "";

  return (
    <aside className="dash-sidebar" aria-label="Navigation principale">
      <Link href="/dashboard" className="dash-sidebar__brand">
        <span className="dash-sidebar__logo" aria-hidden />
        <span className="dash-sidebar__brand-text">
          <span className="dash-sidebar__brand-name">Kingshot</span>
          <span className="dash-sidebar__brand-tag">War command</span>
        </span>
      </Link>

      <nav className="dash-sidebar__nav">
        {NAV.map(({ href, label, short, live, match }) => {
          const active = match(pathname);
          return (
            <Link
              key={href}
              href={href}
              className={`dash-sidebar__link ${active ? "dash-sidebar__link--active" : ""}`}
              aria-current={active ? "page" : undefined}
            >
              <span className="dash-sidebar__link-label">{label}</span>
              <span className="dash-sidebar__link-meta">
                <span className="dash-sidebar__link-short">{short}</span>
                {live ? (
                  <span className="dash-sidebar__live" title="Suivi temps réel">
                    LIVE
                  </span>
                ) : null}
              </span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
