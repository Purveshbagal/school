import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { isObjectId } from "@/lib/driver-auth";
import { estimateArrival } from "@/lib/bus-eta";
import { studentDriverIds } from "@/lib/student-app";
import { getStudentFromRequest, studentJson, unauthorizedStudent } from "@/lib/student-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const coord = (raw: string | null, limit: number) => {
  const n = raw == null ? NaN : Number(raw);
  return Number.isFinite(n) && Math.abs(n) <= limit ? n : null;
};

/**
 * Road distance and arrival time from the student's bus to the phone's position
 * (`?trip=…&lat=…&lng=…`). The position is only used for this answer, never stored.
 */
export async function GET(request: NextRequest) {
  const student = await getStudentFromRequest(request);
  if (!student) return unauthorizedStudent();

  const params = request.nextUrl.searchParams;
  const tripId = params.get("trip");
  const lat = student.pickupLat ?? coord(params.get("lat"), 90);
  const lng = student.pickupLng ?? coord(params.get("lng"), 180);
  if (!isObjectId(tripId) || lat == null || lng == null) return studentJson({ error: "Set your pickup location first." }, 400);

  const [trip, driverIds] = await Promise.all([
    prisma.busTrip.findUnique({ where: { id: tripId } }),
    studentDriverIds(student),
  ]);
  if (!trip || trip.status !== "ACTIVE" || !driverIds.includes(trip.driverId)) {
    return studentJson({ error: "This bus is not on a trip right now.", code: "TRIP_ENDED" }, 409);
  }
  if (trip.lastLat == null || trip.lastLng == null) {
    return studentJson({ error: "Waiting for the bus's first location.", code: "NO_POSITION" }, 409);
  }

  const eta = await estimateArrival({ lat: trip.lastLat, lng: trip.lastLng }, { lat, lng });
  return studentJson({ ...eta, busAt: trip.lastPointAt?.getTime() ?? null, serverTime: Date.now() });
}
