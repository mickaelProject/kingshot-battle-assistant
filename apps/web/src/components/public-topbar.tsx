"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { DashboardBrandLogo } from "@/components/dashboard-brand-logo";

const NAV_ITEMS = [
  { href: "/", label: "Accueil" },
  { href: "/features", label: "Features" },
  { href: "/events", label: "Events" },
  { href: "/login", label: "Admin" },
] as const;

export function PublicTopbar() {
  const pathname = usePathname();

  return (
    <header className="public-topbar">
      <div className="public-topbar__inner">
        <Link href="/" className="public-topbar__brand">
          <DashboardBrandLogo variant="topbar" priority className="public-topbar__logo" />
        </Link>
        <nav className="public-topbar__nav" aria-label="Navigation principale">
          {NAV_ITEMS.map((item) => {
            const active =
              item.href === "/"
                ? pathname === item.href
                : pathname?.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`public-topbar__link${active ? " public-topbar__link--active" : ""}`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <Link href="/app/live" className="public-topbar__live-cta">
          Rejoindre un live
        </Link>
      </div>
    </header>
  );
}
