import { redirect } from "next/navigation";
import { isAdminAuthenticated, loginWithSecret } from "@/lib/auth";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
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
      <h1>Admin login</h1>
      <p className="muted">
        Enter the same value as <code>ADMIN_PANEL_SECRET</code> in your{" "}
        <code>.env</code>.
      </p>
      {sp.error ? <p className="err">Invalid secret.</p> : null}
      <form action={login} className="stack" style={{ marginTop: "1.5rem" }}>
        <div>
          <label htmlFor="secret">Secret</label>
          <input
            id="secret"
            name="secret"
            type="password"
            autoComplete="off"
            required
          />
        </div>
        <button type="submit" className="primary">
          Sign in
        </button>
      </form>
    </main>
  );
}
