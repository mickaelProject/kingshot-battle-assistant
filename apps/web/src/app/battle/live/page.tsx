import { redirect } from "next/navigation";

/** Alias demandé produit : même écran que /app/live */
export default async function BattleLiveAliasPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const q = new URLSearchParams();
  for (const [key, val] of Object.entries(sp)) {
    if (typeof val === "string") q.set(key, val);
    else if (Array.isArray(val) && val[0]) q.set(key, val[0]);
  }
  const tail = q.toString();
  redirect(tail ? `/app/live?${tail}` : "/app/live");
}
