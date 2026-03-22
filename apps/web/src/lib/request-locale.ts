import { cookies } from "next/headers";
import {
  defaultLocale,
  localeCookieName,
  locales,
  type AppLocale,
} from "@/i18n/config";

/** Locale from the same cookie as next-intl (for Route Handlers / API). */
export async function getLocaleFromCookie(): Promise<AppLocale> {
  const store = await cookies();
  const raw = store.get(localeCookieName)?.value;
  if (raw != null && (locales as readonly string[]).includes(raw)) {
    return raw as AppLocale;
  }
  return defaultLocale;
}
