import { prisma } from "@/lib/db";
import { driverJson, getDriverFromRequest, isObjectId } from "@/lib/driver-auth";
import { notifyTrackingChanged } from "@/lib/tracking-events";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_POINTS_PER_REQUEST = 1000;
/** Fixes taken this long before the trip started are stale cached positions, not part of the route. */
const PRE_START_TOLERANCE_MS = 30_000;

type IncomingPoint = {
  lat?: unknown;
  lng?: unknown;
  t?: unknown;
  speed?: unknown;
  heading?: unknown;
  accuracy?: unknown;
};

const finiteOrNull = (v: unknown, min: number, max: number): number | null =>
  typeof v === "number" && Number.isFinite(v) && v >= min && v <= max ? v : null;

/**
 * Batch of GPS fixes from the driver app. The app sends them in order and only one
 * request at a time, so anything not newer than the trip's last stored fix is a retry
 * of a batch that already landed and is skipped.
 */
export async function POST(request: Request) {
  const driver = await getDriverFromRequest(request);
  if (!driver) return driverJson({ error: "Session expired. Please log in again.", code: "UNAUTHORIZED" }, 401);

  let body: { tripId?: unknown; sentAt?: unknown; points?: unknown };
  try {
    body = await request.json();
  } catch {
    return driverJson({ error: "Invalid request" }, 400);
  }
  if (!isObjectId(body.tripId)) return driverJson({ error: "Invalid trip" }, 400);
  if (!Array.isArray(body.points)) return driverJson({ error: "Invalid points" }, 400);

  const trip = await prisma.busTrip.findUnique({ where: { id: body.tripId } });
  if (!trip || trip.driverId !== driver.id) {
    return driverJson({ error: "This trip was ended.", code: "TRIP_ENDED" }, 409);
  }
  if (trip.status !== "ACTIVE") {
    return driverJson({ error: "This trip was ended.", code: "TRIP_ENDED" }, 409);
  }

  const serverNow = Date.now();
  // Phones with a wrong clock would put every fix at the wrong time (and look "offline"
  // on the map). The app sends its own clock reading, so shift fixes onto server time.
  // Sub-2-second differences are network latency, not clock error — ignore them so
  // retried batches keep identical timestamps.
  const sentAt = typeof body.sentAt === "number" && Number.isFinite(body.sentAt) ? body.sentAt : serverNow;
  const rawOffset = serverNow - sentAt;
  const clockOffset = Math.abs(rawOffset) < 2000 ? 0 : Math.round(rawOffset / 1000) * 1000;

  const minT = Math.max(trip.startedAt.getTime() - PRE_START_TOLERANCE_MS, trip.lastPointAt?.getTime() ?? -Infinity);
  const points = (body.points as IncomingPoint[])
    .slice(0, MAX_POINTS_PER_REQUEST)
    .map((p) => {
      const lat = finiteOrNull(p?.lat, -90, 90);
      const lng = finiteOrNull(p?.lng, -180, 180);
      const rawT = finiteOrNull(p?.t, 0, Number.MAX_SAFE_INTEGER);
      if (lat == null || lng == null || rawT == null || (lat === 0 && lng === 0)) return null;
      return {
        lat,
        lng,
        t: Math.min(Math.round(rawT + clockOffset), serverNow),
        speed: finiteOrNull(p.speed, 0, 150),
        heading: finiteOrNull(p.heading, 0, 360),
        accuracy: finiteOrNull(p.accuracy, 0, 100_000),
      };
    })
    .filter((p): p is NonNullable<typeof p> => p != null && p.t > minT)
    .sort((a, b) => a.t - b.t)
    // Same timestamp twice in one batch → keep the first.
    .filter((p, i, arr) => i === 0 || p.t !== arr[i - 1].t);

  if (points.length > 0) {
    const last = points[points.length - 1];
    await prisma.busTripPoint.createMany({
      data: points.map((p) => ({
        tripId: trip.id,
        lat: p.lat,
        lng: p.lng,
        speed: p.speed,
        heading: p.heading,
        accuracy: p.accuracy,
        recordedAt: new Date(p.t),
      })),
    });
    await prisma.busTrip.update({
      where: { id: trip.id },
      data: {
        lastLat: last.lat,
        lastLng: last.lng,
        lastSpeed: last.speed,
        lastHeading: last.heading,
        lastAccuracy: last.accuracy,
        lastPointAt: new Date(last.t),
        pointCount: { increment: points.length },
      },
    });
    notifyTrackingChanged(driver.id);
  }

  return driverJson({ ok: true, accepted: points.length, serverTime: serverNow });
}
