export const locales = ["fr", "en", "es"] as const;

export type AppLocale = (typeof locales)[number];

export const defaultLocale: AppLocale = "fr";

export const localeLabels: Record<AppLocale, string> = {
  fr: "Français",
  en: "English",
  es: "Español",
};

export const localeCookieName = "KINGSHOT_LOCALE";
