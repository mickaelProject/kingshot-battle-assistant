import { redirect } from "next/navigation";
import { DashboardNav } from "@/components/dashboard-nav";
import { ToastHost } from "@/components/toast-host";
import { logout, requireAdmin } from "@/lib/auth";

/** Avoid Prisma during `next build` (static prerender); admin always loads fresh from DB. */
export const dynamic = "force-dynamic";

async function doLogout() {
  "use server";
  await logout();
  redirect("/login");
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();

  return (
    <div className="app-dashboard">
      <header className="dash-topbar">
        <DashboardNav />
        <form action={doLogout} className="dash-topbar__logout">
          <button type="submit" className="btn btn-ghost btn-small">
            Déconnexion
          </button>
        </form>
      </header>
      <ToastHost />
      {children}
    </div>
  );
}
