"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import {
  defaultLocale,
  localeCookieName,
  locales,
  type AppLocale,
} from "@/i18n/config";

export async function setUserLocale(locale: string) {
  const next: AppLocale = (locales as readonly string[]).includes(locale)
    ? (locale as AppLocale)
    : defaultLocale;
  const store = await cookies();
  store.set(localeCookieName, next, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  revalidatePath("/", "layout");
}
