import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { logout } from "@/lib/auth";
import { redirect } from "next/navigation";

async function doLogout() {
  "use server";
  await logout();
  redirect("/login");
}

function IconLogout({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <path
        d="M10 17H7a2 2 0 01-2-2V9a2 2 0 012-2h3M14 15l4-3-4-3M18 12H9"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export async function DashboardTopbar({
  botConnected,
}: {
  botConnected: boolean;
}) {
  const t = await getTranslations("topbar");

  return (
    <header className="dash-topbar dash-topbar--war dash-topbar--bar-end">
      <div className="dash-topbar__actions">
        <LocaleSwitcher />
        <div
          className={`dash-status-pill ${botConnected ? "dash-status-pill--ok" : "dash-status-pill--warn"}`}
          title={botConnected ? t("botOkTitle") : t("botWarnTitle")}
        >
          <span className="dash-status-pill__dot" aria-hidden />
          {botConnected ? t("botOk") : t("botWarn")}
        </div>
        <Link href="/dashboard/events" className="btn btn-primary dash-topbar__launch">
          {t("launchEvent")}
        </Link>
        <form action={doLogout} className="dash-topbar__logout">
          <button type="submit" className="dash-topbar__logout-btn">
            <IconLogout />
            <span>{t("logout")}</span>
          </button>
        </form>
      </div>
    </header>
  );
}
