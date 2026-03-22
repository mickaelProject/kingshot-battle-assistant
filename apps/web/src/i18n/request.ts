import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import {
  defaultLocale,
  localeCookieName,
  locales,
  type AppLocale,
} from "./config";

function isAppLocale(value: string | undefined): value is AppLocale {
  return value != null && (locales as readonly string[]).includes(value);
}

export default getRequestConfig(async () => {
  const store = await cookies();
  const raw = store.get(localeCookieName)?.value;
  const locale: AppLocale = isAppLocale(raw) ? raw : defaultLocale;

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
