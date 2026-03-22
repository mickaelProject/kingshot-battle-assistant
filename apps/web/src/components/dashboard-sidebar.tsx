"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { DashboardBrandLogo } from "@/components/dashboard-brand-logo";

function NavIcon({ children }: { children: ReactNode }) {
  return (
    <span
      className="flex h-5 w-5 shrink-0 items-center justify-center text-current"
      aria-hidden
    >
      {children}
    </span>
  );
}

function IconRadar() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="12" cy="12" r="1.2" fill="currentColor" />
      <path
        d="M12 3v2M12 19v2M3 12h2M19 12h2"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconBriefing() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <rect
        x="5"
        y="4"
        width="14"
        height="16"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <path
        d="M8 8h8M8 11h6M8 14h8"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconOrbat() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path
        d="M4 6h6v4H4V6zm10 0h6v4h-6V6zM4 14h6v4H4v-4zm10 0h6v4h-6v-4z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconCrosshair() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="7" stroke="currentColor" strokeWidth="1.4" />
      <path
        d="M12 5v3M12 16v3M5 12h3M16 12h3"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" />
    </svg>
  );
}

function IconTower() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path
        d="M8 20V10l4-6 4 6v10"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path
        d="M6 20h12M10 20v-4h4v4"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
      <path
        d="M12 4v2M9 7h6"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconForward() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path
        d="M4 8l8-4 8 4v8l-8 4-8-4V8z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
      <path
        d="M12 11v6M9 13l3 3 3-3"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

type NavItem = {
  href: string;
  labelKey: "overview" | "events" | "templates" | "runs" | "server" | "playerApp";
  match: (p: string) => boolean;
  icon: ReactNode;
  live?: boolean;
};

function buildNavGroups(): {
  command: NavItem[];
  ops: NavItem[];
  system: NavItem[];
} {
  return {
    command: [
      {
        href: "/dashboard",
        labelKey: "overview",
        match: (p) => p === "/dashboard",
        icon: <IconRadar />,
      },
      {
        href: "/dashboard/events",
        labelKey: "events",
        match: (p) => p.startsWith("/dashboard/events"),
        icon: <IconBriefing />,
      },
      {
        href: "/dashboard/templates",
        labelKey: "templates",
        match: (p) => p.startsWith("/dashboard/templates"),
        icon: <IconOrbat />,
      },
    ],
    ops: [
      {
        href: "/dashboard/runs",
        labelKey: "runs",
        match: (p) => p.startsWith("/dashboard/runs"),
        icon: <IconCrosshair />,
        live: true,
      },
    ],
    system: [
      {
        href: "/dashboard/server",
        labelKey: "server",
        match: (p) => p.startsWith("/dashboard/server"),
        icon: <IconTower />,
      },
      {
        href: "/app",
        labelKey: "playerApp",
        match: (p) => p.startsWith("/app") || p.startsWith("/battle"),
        icon: <IconForward />,
      },
    ],
  };
}

function NavLink({
  item,
  label,
  liveLabel,
}: {
  item: NavItem;
  label: string;
  liveLabel: string;
}) {
  const pathname = usePathname() ?? "";
  const active = item.match(pathname);
  return (
    <Link
      href={item.href}
      className={[
        "flex items-center gap-2.5 rounded-lg py-2 text-sm transition-all",
        active
          ? "border-l-2 border-amber-500 bg-[#111318] pl-[10px] pr-3 font-medium text-slate-200"
          : "px-3 text-slate-500 hover:bg-[#111318] hover:text-slate-300",
      ].join(" ")}
      aria-current={active ? "page" : undefined}
    >
      <NavIcon>{item.icon}</NavIcon>
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {item.live ? (
        <span className="ml-auto flex shrink-0 items-center gap-1">
          <span
            className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500"
            aria-hidden
          />
          <span className="text-[10px] font-semibold tracking-wide text-red-400">
            {liveLabel}
          </span>
        </span>
      ) : null}
    </Link>
  );
}

export function DashboardSidebar({ botConnected }: { botConnected: boolean }) {
  const t = useTranslations("nav");
  const tCommon = useTranslations("common");
  const { command, ops, system } = buildNavGroups();

  return (
    <aside
      className="z-50 flex w-full shrink-0 flex-col border-b border-[#1e2230] bg-[#0d0f14] px-3 py-4 md:sticky md:top-0 md:h-screen md:w-56 md:border-b-0 md:border-r md:border-[#1e2230]"
      aria-label={t("ariaMain")}
    >
      <Link
        href="/dashboard"
        className="mb-5 flex min-w-0 items-center gap-1 rounded-md px-0.5 py-1.5 no-underline transition hover:bg-white/[0.03]"
        aria-label={t("brandAria")}
      >
        <DashboardBrandLogo variant="sidebar" />
        <span className="min-w-0 flex-1 leading-tight">
          <span className="block truncate font-display text-sm font-bold tracking-wide text-zinc-100">
            {t("brandName")}
          </span>
          <span className="mt-0.5 block text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-500/95">
            {t("brandSubtitle")}
          </span>
        </span>
      </Link>

      <nav className="flex flex-1 flex-col overflow-y-auto">
        <div className="mb-1 px-3">
          <span className="px-2 text-[9px] font-semibold uppercase tracking-[0.15em] text-slate-600">
            {t("groupCommand")}
          </span>
        </div>
        <div className="flex flex-col gap-0.5">
          {command.map((item) => (
            <NavLink
              key={item.href}
              item={item}
              label={t(item.labelKey)}
              liveLabel={tCommon("live")}
            />
          ))}
        </div>

        <div className="mb-1 mt-4 px-3">
          <span className="px-2 text-[9px] font-semibold uppercase tracking-[0.15em] text-slate-600">
            {t("groupOps")}
          </span>
        </div>
        <div className="flex flex-col gap-0.5">
          {ops.map((item) => (
            <NavLink
              key={item.href}
              item={item}
              label={t(item.labelKey)}
              liveLabel={tCommon("live")}
            />
          ))}
        </div>

        <div className="mb-1 mt-4 px-3">
          <span className="px-2 text-[9px] font-semibold uppercase tracking-[0.15em] text-slate-600">
            {t("groupNetwork")}
          </span>
        </div>
        <div className="flex flex-col gap-0.5">
          {system.map((item) => (
            <NavLink
              key={item.href}
              item={item}
              label={t(item.labelKey)}
              liveLabel={tCommon("live")}
            />
          ))}
        </div>
      </nav>

      <div className="mt-auto border-t border-[#1e2230] px-4 py-3">
        <div className="flex items-center gap-2">
          <div
            className={`h-1.5 w-1.5 rounded-full ${botConnected ? "bg-green-400" : "bg-amber-500"}`}
            aria-hidden
          />
          <span className="text-[11px] text-slate-500">
            {botConnected ? t("botConnected") : t("botDisconnected")}
          </span>
        </div>
      </div>
    </aside>
  );
}
