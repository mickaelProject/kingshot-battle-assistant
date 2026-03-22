import { NextResponse } from "next/server";
import { buildLivePlayerViewPayload } from "@/lib/live-player-payload";
import { getLocaleFromCookie } from "@/lib/request-locale";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  ctx: { params: Promise<{ runId: string }> },
) {
  const { runId } = await ctx.params;
  const me = new URL(req.url).searchParams.get("me")?.trim() || null;
  const locale = await getLocaleFromCookie();
  const payload = await buildLivePlayerViewPayload(runId, me, { locale });
  if (!payload) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  return NextResponse.json(payload, {
    headers: { "Cache-Control": "no-store" },
  });
}
