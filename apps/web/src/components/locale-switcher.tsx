"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { setUserLocale } from "@/actions/locale";
import { localeLabels, locales, type AppLocale } from "@/i18n/config";

function IconPlanet({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <circle
        cx="12"
        cy="12"
        r="8"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinecap="round"
      />
      <ellipse
        cx="12"
        cy="12"
        rx="3.2"
        ry="8"
        stroke="currentColor"
        strokeWidth="1.2"
      />
      <path
        d="M4 12h16M5 9c2.5 1 4.5 1 7 1s4.5 0 7-1M5 15c2.5-1 4.5-1 7-1s4.5 0 7 1"
        stroke="currentColor"
        strokeWidth="1.15"
        strokeLinecap="round"
      />
      <circle
        cx="15"
        cy="9"
        r="1.1"
        fill="currentColor"
        opacity="0.55"
      />
      <circle cx="9" cy="14" r="0.85" fill="currentColor" opacity="0.4" />
    </svg>
  );
}

export function LocaleSwitcher() {
  const t = useTranslations("localeSwitcher");
  const router = useRouter();
  const locale = useLocale() as AppLocale;
  const [pending, startTransition] = useTransition();

  return (
    <div className="locale-switcher" title={t("hint")}>
      <label className="locale-switcher__label">
        <span className="locale-switcher__planet" aria-hidden>
          <IconPlanet className="text-sky-400/90" />
        </span>
        <span className="locale-switcher__text">{t("label")}</span>
        <select
          className="locale-switcher__select"
          value={locale}
          disabled={pending}
          aria-label={t("hint")}
          onChange={(e) => {
            const v = e.target.value as AppLocale;
            startTransition(async () => {
              await setUserLocale(v);
              router.refresh();
            });
          }}
        >
          {locales.map((loc) => (
            <option key={loc} value={loc}>
              {localeLabels[loc]}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
