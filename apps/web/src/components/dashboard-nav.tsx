"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  {
    href: "/dashboard",
    label: "Vue d’ensemble",
    match: (p: string) => p === "/dashboard",
  },
  {
    href: "/dashboard/events",
    label: "Événements",
    match: (p: string) => p.startsWith("/dashboard/events"),
  },
  {
    href: "/dashboard/templates",
    label: "Modèles",
    match: (p: string) => p.startsWith("/dashboard/templates"),
  },
  {
    href: "/dashboard/runs",
    label: "Exécutions",
    match: (p: string) => p.startsWith("/dashboard/runs"),
  },
  {
    href: "/dashboard/server",
    label: "Serveur",
    match: (p: string) => p.startsWith("/dashboard/server"),
  },
] as const;

export function DashboardNav() {
  const pathname = usePathname() ?? "";

  return (
    <nav className="dash-nav" aria-label="Navigation principale">
      <Link href="/dashboard" className="dash-nav__brand">
        <span className="dash-nav__logo" aria-hidden />
        <span className="dash-nav__brand-text">
          <span className="dash-nav__brand-name">Battle Control</span>
          <span className="dash-nav__brand-tag">Centre alliance</span>
        </span>
      </Link>
      <div className="dash-nav__links">
        {NAV.map(({ href, label, match }) => {
          const active = match(pathname);
          return (
            <Link
              key={href}
              href={href}
              className={`dash-nav__link ${active ? "dash-nav__link--active" : ""}`}
              aria-current={active ? "page" : undefined}
            >
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
