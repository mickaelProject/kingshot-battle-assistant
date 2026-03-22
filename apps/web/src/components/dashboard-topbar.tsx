import Link from "next/link";
import { logout } from "@/lib/auth";
import { redirect } from "next/navigation";

async function doLogout() {
  "use server";
  await logout();
  redirect("/login");
}

export function DashboardTopbar({ botConnected }: { botConnected: boolean }) {
  return (
    <header className="dash-topbar">
      <div className="dash-topbar__left">
        <span className="dash-topbar__page-hint" aria-hidden>
          Centre de commandement
        </span>
      </div>
      <div className="dash-topbar__actions">
        <div
          className={`dash-status-pill ${botConnected ? "dash-status-pill--ok" : "dash-status-pill--warn"}`}
          title={
            botConnected
              ? "Token bot présent — le worker peut contrôler Discord."
              : "Token bot manquant — configurez DISCORD_BOT_TOKEN."
          }
        >
          <span className="dash-status-pill__dot" aria-hidden />
          {botConnected ? "Bot prêt" : "Bot hors ligne"}
        </div>
        <Link href="/dashboard/events" className="btn btn-primary dash-topbar__launch">
          Lancer un événement
        </Link>
        <form action={doLogout} className="dash-topbar__logout">
          <button type="submit" className="btn btn-ghost btn-small">
            Déconnexion
          </button>
        </form>
      </div>
    </header>
  );
}
