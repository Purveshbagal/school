import { getSession } from "@/lib/auth";
import { canViewTracking, getTrackingFeed } from "@/lib/tracking-server";
import { trackingFeedStream } from "@/lib/tracking-stream";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Server-Sent Events feed for the admin live map: every active trip. */
export async function GET(request: Request) {
  const session = await getSession();
  if (!canViewTracking(session)) {
    return Response.json({ error: "Not authorized" }, { status: 401 });
  }

  return trackingFeedStream(request, { readFeed: (cursor) => getTrackingFeed(cursor) });
}
