import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { LivePlayerScreen } from "@/components/live-player-screen";
import { defaultLocale, locales, type AppLocale } from "@/i18n/config";
import { buildLivePlayerViewPayload } from "@/lib/live-player-payload";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ runId: string }>;
  searchParams: Promise<{ me?: string }>;
};

function coerceAppLocale(value: string): AppLocale {
  return (locales as readonly string[]).includes(value)
    ? (value as AppLocale)
    : defaultLocale;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { runId } = await params;
  const t = await getTranslations("livePlayer");
  const locale = coerceAppLocale(await getLocale());
  const payload = await buildLivePlayerViewPayload(runId, null, { locale });
  if (!payload) {
    return { title: t("notFound") };
  }
  return {
    title: t("metaTitle", { mission: payload.missionTitle }),
    description: payload.eventDisplayName,
  };
}

export default async function LiveRunPage({ params, searchParams }: Props) {
  const { runId } = await params;
  const sp = await searchParams;
  const me = sp.me?.trim() ?? null;
  const locale = coerceAppLocale(await getLocale());
  const initial = await buildLivePlayerViewPayload(runId, me, { locale });
  if (!initial) notFound();

  return (
    <LivePlayerScreen initial={initial} runId={runId} playerMe={me} />
  );
}
