"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export type SitrepState = "idle" | "active" | "critical";

function useCountdown(initialSeconds: number | undefined): string {
  const [remaining, setRemaining] = useState(() =>
    Math.max(0, initialSeconds ?? 0),
  );

  useEffect(() => {
    setRemaining(Math.max(0, initialSeconds ?? 0));
  }, [initialSeconds]);

  useEffect(() => {
    const id = window.setInterval(() => {
      setRemaining((r) => Math.max(0, r - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  const mm = String(Math.floor(remaining / 60)).padStart(2, "0");
  const ss = String(remaining % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

const styleConfig = {
  idle: {
    wrapper: "bg-[#111318] border border-[#1e2230]",
    title: "text-slate-400",
    showProgress: false,
    showNext: false,
    showCTAs: true,
  },
  active: {
    wrapper: "bg-[#0f1a10] border border-green-900/30",
    title: "text-green-400",
    showProgress: true,
    showNext: true,
    showCTAs: false,
  },
  critical: {
    wrapper:
      "bg-[#1a0e0e] border border-red-900/30 animate-pulse-border",
    title: "text-red-400",
    showProgress: true,
    showNext: true,
    showCTAs: false,
  },
} as const;

function IconClock() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <path
        d="M12 7v5l3 2"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconBolt() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M13 2L3 14h8l-1 8 10-12h-8l1-8z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconAlert() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 9v4M12 17h.01M10.3 4.8L2.4 18c-.4.7.1 1.6.9 1.6h17.4c.8 0 1.3-.9.9-1.6l-7.9-13.2a1 1 0 00-1.7 0z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export interface SitrepBlockProps {
  state: SitrepState;
  eventName?: string;
  phaseIndex?: number;
  totalPhases?: number;
  nextPhaseName?: string | null;
  nextPhaseIn?: number | null;
  progressPercent?: number;
  nextScheduled?: { id: string; name: string; atLabel: string } | null;
}

export function SitrepBlock({
  state,
  eventName,
  phaseIndex = 0,
  totalPhases = 0,
  nextPhaseName,
  nextPhaseIn,
  progressPercent = 0,
  nextScheduled,
}: SitrepBlockProps) {
  const t = useTranslations("sitrep");
  const countdown = useCountdown(
    nextPhaseIn != null ? nextPhaseIn : undefined,
  );
  const config = styleConfig[state];
  const pct = Math.min(100, Math.max(0, progressPercent));

  const subtitle =
    state === "idle"
      ? t("idleSub")
      : state === "active"
        ? t("activeSubtitle", { phaseIndex, totalPhases })
        : nextPhaseName
          ? t("criticalWithPhase", { name: nextPhaseName })
          : t("criticalFallback");

  const headerIcon =
    state === "idle" ? (
      <IconClock />
    ) : state === "active" ? (
      <IconBolt />
    ) : (
      <IconAlert />
    );

  return (
    <section
      className={cn("mb-4 rounded-xl p-5", config.wrapper)}
      aria-label={t("aria")}
    >
      <div className="mb-3 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1e2230] text-slate-500">
          {headerIcon}
        </div>
        <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-600">
          {t("badge")}
        </span>
        {state === "active" ? (
          <span className="ml-auto flex items-center gap-1.5 rounded-full border border-green-500/20 bg-green-500/10 px-2 py-0.5 text-[10px] font-semibold text-green-400">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-400" />
            {t("inProgress")}
          </span>
        ) : null}
      </div>

      {config.showProgress ? (
        <div className="mb-4 h-0.5 overflow-hidden rounded-full bg-[#1e2230]">
          <div
            className="h-full rounded-full transition-all duration-1000"
            style={{
              width: `${pct}%`,
              background: state === "critical" ? "#ef4444" : "#22c55e",
            }}
          />
        </div>
      ) : null}

      <div
        className={cn(
          "mb-1 font-rajdhani text-xl font-bold tracking-tight",
          config.title,
        )}
      >
        {state === "active"
          ? (eventName ?? t("missionFallback"))
          : state === "critical"
            ? t("criticalTitle")
            : t("idleTitle")}
      </div>

      <div className="mb-4 text-sm text-slate-500">
        {state === "idle" ? (
          <>
            {t("idleSub")}
            {nextScheduled ? (
              <p className="mt-3 text-sm text-slate-500">
                {t("nextMission")}
                <span className="text-slate-300">{nextScheduled.name}</span>
                <span className="text-slate-600">
                  {" "}
                  — {nextScheduled.atLabel}
                </span>
                {" · "}
                <Link
                  href={`/dashboard/runs/${nextScheduled.id}`}
                  className="text-amber-500 hover:text-amber-400 hover:underline"
                >
                  {t("open")}
                </Link>
              </p>
            ) : null}
          </>
        ) : (
          subtitle
        )}
      </div>

      {config.showNext && (state === "active" || state === "critical") ? (
        <div className="mb-4 flex items-center gap-3 rounded-lg bg-black/20 px-3 py-2.5">
          <div className="h-2 w-2 flex-shrink-0 animate-pulse rounded-full bg-amber-500" />
          <div className="min-w-0 flex-1">
            <div className="text-[10px] text-slate-600">
              {t("nextPhaseLabel")}
            </div>
            <div className="text-xs font-medium text-amber-400">
              {nextPhaseName ?? "—"}
            </div>
          </div>
          <div className="font-rajdhani text-lg font-bold tabular-nums text-amber-500">
            {countdown}
          </div>
        </div>
      ) : null}

      {config.showCTAs ? (
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/dashboard/events"
            className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-amber-400"
          >
            {t("launchEvent")}
          </Link>
          <Link
            href="/dashboard/events?mode=schedule"
            className="rounded-lg border border-[#1e2230] px-4 py-2 text-sm text-slate-400 transition-all hover:border-[#2a3042] hover:text-slate-300"
          >
            {t("schedule")}
          </Link>
          <Link
            href="/dashboard/templates/new"
            className="rounded-lg border border-[#1e2230] px-4 py-2 text-sm text-slate-400 transition-all hover:border-[#2a3042] hover:text-slate-300"
          >
            {t("newTemplate")}
          </Link>
        </div>
      ) : null}

      {!config.showCTAs && state !== "idle" ? (
        <div className="mt-2">
          <Link
            href="/dashboard/runs"
            className="inline-flex rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-amber-400"
          >
            {t("pilotLive")}
          </Link>
        </div>
      ) : null}
    </section>
  );
}
