import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { isAdminAuthenticated, loginWithSecret } from "@/lib/auth";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const t = await getTranslations("login");
  if (await isAdminAuthenticated()) redirect("/dashboard");
  const sp = await searchParams;

  async function login(formData: FormData) {
    "use server";
    const secret = String(formData.get("secret") ?? "");
    const ok = await loginWithSecret(secret);
    if (!ok) redirect("/login?error=1");
    redirect("/dashboard");
  }

  return (
    <main style={{ maxWidth: 400, marginTop: "4rem" }}>
      <h1>{t("title")}</h1>
      <p className="muted">{t("hint")}</p>
      {sp.error ? <p className="err">{t("error")}</p> : null}
      <form action={login} className="stack" style={{ marginTop: "1.5rem" }}>
        <div>
          <label htmlFor="secret">{t("secretLabel")}</label>
          <input
            id="secret"
            name="secret"
            type="password"
            autoComplete="off"
            required
          />
        </div>
        <button type="submit" className="primary">
          {t("submit")}
        </button>
      </form>
    </main>
  );
}
