import "server-only";
import { prisma } from "@/lib/db";
import type { Session } from "@/lib/auth";
import type { BusTrip } from "@/generated/prisma/client";
import {
  pathDistanceMeters,
  toWirePoint,
  type TrackPoint,
  type TrackingFeed,
  type TripSummary,
  type WirePoint,
} from "@/lib/tracking";

export const LIVE_TRACKING_HREF = "/live-tracking";

/** Feed queries reach this far behind the cursor, so a point written while a query ran is never skipped. */
const FEED_OVERLAP_MS = 15_000;

const POINT_SELECT = {
  lat: true,
  lng: true,
  recordedAt: true,
  speed: true,
  heading: true,
  accuracy: true,
} as const;

type PointRow = {
  lat: number;
  lng: number;
  recordedAt: Date;
  speed: number | null;
  heading: number | null;
  accuracy: number | null;
};

export function canViewTracking(session: Session | null): boolean {
  if (!session) return false;
  return session.role === "admin" || session.permissions.includes(LIVE_TRACKING_HREF);
}

export function rowToPoint(row: PointRow): TrackPoint {
  return {
    lat: row.lat,
    lng: row.lng,
    t: row.recordedAt.getTime(),
    speed: row.speed,
    heading: row.heading,
    accuracy: row.accuracy,
  };
}

export function toTripSummary(trip: BusTrip): TripSummary {
  return {
    id: trip.id,
    driverId: trip.driverId,
    driverName: trip.driverName,
    busId: trip.busId,
    vehicleNumber: trip.vehicleNumber,
    direction: trip.direction === "TO_HOME" ? "TO_HOME" : "TO_SCHOOL",
    status: trip.status === "ACTIVE" ? "ACTIVE" : "COMPLETED",
    startedAt: trip.startedAt.getTime(),
    endedAt: trip.endedAt?.getTime() ?? null,
    lastPointAt: trip.lastPointAt?.getTime() ?? null,
    lastLat: trip.lastLat,
    lastLng: trip.lastLng,
    lastSpeed: trip.lastSpeed,
    lastHeading: trip.lastHeading,
    lastAccuracy: trip.lastAccuracy,
    distanceMeters: trip.distanceMeters,
  };
}

export async function getTripPoints(tripId: string): Promise<TrackPoint[]> {
  const rows = await prisma.busTripPoint.findMany({
    where: { tripId },
    orderBy: { recordedAt: "asc" },
    select: POINT_SELECT,
  });
  return rows.map(rowToPoint);
}

/**
 * Marks an active trip completed and stores its distance. A trip that never received a
 * single GPS fix has nothing to show, so it's removed instead of cluttering history.
 * Safe to call twice — only the first call (while the trip is still ACTIVE) does anything.
 */
export async function completeTrip(tripId: string, endedAt: Date): Promise<void> {
  const points = await getTripPoints(tripId);

  if (points.length === 0) {
    await prisma.busTrip.deleteMany({ where: { id: tripId, status: "ACTIVE" } });
    return;
  }

  const lastT = points[points.length - 1].t;
  await prisma.busTrip.updateMany({
    where: { id: tripId, status: "ACTIVE" },
    data: {
      status: "COMPLETED",
      // Never end before the last fix we actually have.
      endedAt: new Date(Math.max(endedAt.getTime(), lastT)),
      distanceMeters: pathDistanceMeters(points),
    },
  });
}



/** A client further behind than this gets a fresh snapshot instead of a huge delta. */
const MAX_DELTA_AGE_MS = 10 * 60 * 1000;

/**
 * The live map's data: every active trip, plus either each trip's whole path (snapshot,
 * no `since`) or only the points stored after `since`, a cursor from an earlier call
 * (delta). A trip missing from `trips` is no longer live — ended, or removed.
 * `driverIds` limits the feed to those drivers' trips (the student app's own bus).
 */
export async function getTrackingFeed(since: number | null, driverIds?: string[]): Promise<TrackingFeed> {
  // Taken before querying: anything written while the queries run is re-read next time.
  const now = Date.now();
  const isDelta = since != null && Number.isFinite(since) && now - since < MAX_DELTA_AGE_MS;

  const trips =
    driverIds && driverIds.length === 0
      ? []
      : await prisma.busTrip.findMany({
          where: { status: "ACTIVE", ...(driverIds ? { driverId: { in: driverIds } } : {}) },
          orderBy: { startedAt: "asc" },
        });
  const points: Record<string, WirePoint[]> = {};

  if (!isDelta) {
    const pointLists = await Promise.all(trips.map((trip) => getTripPoints(trip.id)));
    trips.forEach((trip, i) => {
      points[trip.id] = pointLists[i].map(toWirePoint);
    });
    return { type: "snapshot", cursor: now, serverTime: now, trips: trips.map(toTripSummary), points };
  }

  if (trips.length > 0) {
    const rows = await prisma.busTripPoint.findMany({
      where: {
        tripId: { in: trips.map((trip) => trip.id) },
        createdAt: { gte: new Date(since - FEED_OVERLAP_MS) },
      },
      orderBy: { recordedAt: "asc" },
      select: { ...POINT_SELECT, tripId: true },
    });
    for (const row of rows) {
      (points[row.tripId] ??= []).push(toWirePoint(rowToPoint(row)));
    }
  }
  return { type: "delta", cursor: now, serverTime: now, trips: trips.map(toTripSummary), points };
}
