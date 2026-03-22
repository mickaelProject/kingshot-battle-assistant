import { DashboardSidebar } from "@/components/dashboard-sidebar";
import { DashboardTopbar } from "@/components/dashboard-topbar";
import { ToastHost } from "@/components/toast-host";
import { requireAdmin } from "@/lib/auth";
import { hasDiscordBotToken } from "@/lib/discord-rest";
import { Inter, Rajdhani } from "next/font/google";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const rajdhani = Rajdhani({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-rajdhani",
  display: "swap",
});

/** Avoid Prisma during `next build` (static prerender); admin always loads fresh from DB. */
export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();
  const botConnected = hasDiscordBotToken();

  return (
    <div
      className={`app-dashboard dash-shell ${inter.variable} ${rajdhani.variable} font-sans antialiased`}
    >
      <DashboardSidebar botConnected={botConnected} />
      <div className="dash-main-wrap">
        <DashboardTopbar botConnected={botConnected} />
        <ToastHost />
        <main className="dash-main">{children}</main>
      </div>
    </div>
  );
}
