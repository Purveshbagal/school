import type { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { canViewTracking, getTrackingFeed } from "@/lib/tracking-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Polling fallback for the live map, used when the event stream can't stay connected. */
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!canViewTracking(session)) {
    return Response.json({ error: "Not authorized" }, { status: 401 });
  }

  const sinceParam = request.nextUrl.searchParams.get("since");
  const since = sinceParam ? Number(sinceParam) : null;
  const feed = await getTrackingFeed(since != null && Number.isFinite(since) ? since : null);
  return Response.json(feed, { headers: { "Cache-Control": "no-store" } });
}
