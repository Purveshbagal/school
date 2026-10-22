import { studentBusFeed } from "@/lib/student-app";
import { getStudentFromRequest, unauthorizedStudent } from "@/lib/student-auth";
import { trackingFeedStream } from "@/lib/tracking-stream";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Many students watch at once, so without a signal each stream only re-reads this often. */
const FALLBACK_SYNC_MS = 10_000;

/**
 * Server-Sent Events feed of the student's own bus. Woken only by uploads from that bus's
 * driver, so each GPS fix reaches the app within ~100 ms.
 */
export async function GET(request: Request) {
  const student = await getStudentFromRequest(request);
  if (!student) return unauthorizedStudent();

  let driverIds: string[] = [];
  return trackingFeedStream(request, {
    readFeed: async (cursor) => {
      const feed = await studentBusFeed(student, cursor);
      driverIds = feed.buses.map((b) => b.driverId);
      return feed;
    },
    wakesFor: (driverId) => driverId === undefined || driverIds.includes(driverId),
    fallbackSyncMs: FALLBACK_SYNC_MS,
  });
}
