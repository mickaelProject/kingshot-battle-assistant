import Link from "next/link";
import { getTranslations } from "next-intl/server";

export default async function LiveRunNotFound() {
  const t = await getTranslations("livePlayer");
  return (
    <main className="live-player live-player--notfound">
      <p className="live-player__mission">{t("notFound")}</p>
      <Link href="/app" className="live-player__link">
        {t("backApp")}
      </Link>
    </main>
  );
}
