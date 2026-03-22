import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const COOKIE = "ks_admin";

if (
  process.env.NODE_ENV === "production" &&
  !process.env.ADMIN_PANEL_SECRET?.trim()
) {
  console.warn(
    "[kingshot:web] ADMIN_PANEL_SECRET est absent : la connexion admin sera impossible.",
  );
}

function tokenFromSecret(secret: string): string {
  return createHmac("sha256", secret).update("kingshot-admin-v1").digest("hex");
}

export async function loginWithSecret(secret: string): Promise<boolean> {
  const expected = process.env.ADMIN_PANEL_SECRET;
  if (!expected || secret !== expected) return false;
  const jar = await cookies();
  jar.set(COOKIE, tokenFromSecret(secret), {
    httpOnly: true,
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  return true;
}

export async function logout(): Promise<void> {
  const jar = await cookies();
  jar.delete(COOKIE);
}

export async function isAdminAuthenticated(): Promise<boolean> {
  const secret = process.env.ADMIN_PANEL_SECRET;
  if (!secret) return false;
  const jar = await cookies();
  const got = jar.get(COOKIE)?.value;
  if (!got) return false;
  const want = tokenFromSecret(secret);
  if (got.length !== want.length) return false;
  try {
    return timingSafeEqual(Buffer.from(got), Buffer.from(want));
  } catch {
    return false;
  }
}

export async function requireAdmin(): Promise<void> {
  if (!(await isAdminAuthenticated())) redirect("/login");
}
