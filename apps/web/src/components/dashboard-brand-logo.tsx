"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import kingshotLogo from "@/assets/brand/kingshot-logo.png";

type Props = {
  variant: "sidebar" | "topbar";
  className?: string;
  priority?: boolean;
};

/**
 * Logo : remplace `src/assets/brand/kingshot-logo.png` par ton fichier (PNG recommandé).
 * Repli (K + texte) si le fichier est absent ou illisible.
 */
export function DashboardBrandLogo({
  variant,
  className = "",
  priority = false,
}: Props) {
  const [ok, setOk] = useState(true);
  const t = useTranslations("nav");

  /** `mix-blend-screen` : le noir opaque du PNG se fond dans le fond sombre (#0d0f14). */
  const imgClass =
    variant === "sidebar"
      ? "h-11 w-auto max-w-full shrink-0 object-contain object-left mix-blend-screen md:h-[52px] md:-mr-0.5"
      : "h-9 w-auto max-w-[148px] object-contain object-left mix-blend-screen sm:max-w-[180px]";

  if (!ok) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 ${className}`.trim()}
      >
        <span
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-black font-display text-xl font-bold text-war-amber shadow-[0_0_14px_rgba(245,158,11,0.45)] ring-1 ring-amber-500/35"
          aria-hidden
        >
          K
        </span>
        <span className="min-w-0 leading-tight">
          <span className="block truncate font-display text-base font-bold tracking-wide text-zinc-100">
            Kingshot
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-500">
            {t("brandSubtitle")}
          </span>
        </span>
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center ${className}`.trim()}>
      <img
        src={kingshotLogo.src}
        width={kingshotLogo.width}
        height={kingshotLogo.height}
        alt={t("brandLogoAlt")}
        className={imgClass}
        decoding="async"
        fetchPriority={priority ? "high" : undefined}
        onError={() => setOk(false)}
      />
    </span>
  );
}
