import { prisma } from "@/lib/db";
import { driverJson, getDriverFromRequest, isObjectId } from "@/lib/driver-auth";
import { completeTrip } from "@/lib/tracking-server";
import { notifyTrackingChanged } from "@/lib/tracking-events";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** "Stop" in the app. Idempotent — stopping an already-ended trip just succeeds. */
export async function POST(request: Request) {
  const driver = await getDriverFromRequest(request);
  if (!driver) return driverJson({ error: "Session expired. Please log in again.", code: "UNAUTHORIZED" }, 401);

  let body: { tripId?: unknown };
  try {
    body = await request.json();
  } catch {
    return driverJson({ error: "Invalid request" }, 400);
  }
  if (!isObjectId(body.tripId)) return driverJson({ error: "Invalid trip" }, 400);

  const trip = await prisma.busTrip.findUnique({ where: { id: body.tripId } });
  if (!trip || trip.driverId !== driver.id) return driverJson({ ok: true });

  if (trip.status === "ACTIVE") {
    await completeTrip(trip.id, new Date());
    notifyTrackingChanged(driver.id);
  }
  return driverJson({ ok: true });
}
