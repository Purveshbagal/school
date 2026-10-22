import { prisma } from "@/lib/db";
import { driverJson, getDriverFromRequest } from "@/lib/driver-auth";
import { completeTrip } from "@/lib/tracking-server";
import { notifyTrackingChanged } from "@/lib/tracking-events";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** "Drive" in the app: opens a new trip for the driver's assigned bus. */
export async function POST(request: Request) {
  const driver = await getDriverFromRequest(request);
  if (!driver) return driverJson({ error: "Session expired. Please log in again.", code: "UNAUTHORIZED" }, 401);
  if (!driver.bus) {
    return driverJson({ error: "No bus is assigned to you. Ask the school office to assign one.", code: "NO_BUS" }, 400);
  }
  let direction: "TO_SCHOOL" | "TO_HOME" = "TO_SCHOOL";
  try {
    const body = await request.json() as { direction?: unknown };
    if (body.direction === "TO_HOME") direction = "TO_HOME";
    else if (body.direction != null && body.direction !== "TO_SCHOOL") {
      return driverJson({ error: "Invalid trip direction." }, 400);
    }
  } catch { /* Old driver app versions send an empty body. */ }

  // One live trip per driver and per bus: anything still open (app crashed, another
  // driver forgot to stop on this bus) is closed before the new one starts.
  const open = await prisma.busTrip.findMany({
    where: { status: "ACTIVE", OR: [{ driverId: driver.id }, { busId: driver.bus.id }] },
    select: { id: true, lastPointAt: true, startedAt: true },
  });
  for (const trip of open) {
    await completeTrip(trip.id, trip.lastPointAt ?? trip.startedAt);
  }

  const trip = await prisma.busTrip.create({
    data: {
      driverId: driver.id,
      driverName: driver.name,
      busId: driver.bus.id,
      vehicleNumber: driver.bus.vehicleNumber,
      direction,
    },
  });

  notifyTrackingChanged();
  return driverJson({
    trip: { id: trip.id, vehicleNumber: trip.vehicleNumber, startedAt: trip.startedAt.getTime(), direction },
  });
}
