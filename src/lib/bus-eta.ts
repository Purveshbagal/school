import "server-only";
import { haversineMeters } from "@/lib/tracking";

// How long the bus needs to reach a student. The road distance and drive time come from
// OSRM (OpenStreetMap routing); a school bus is slower than the car that OSRM assumes and
// it stops on the way, so its drive time is stretched. Without a route (offline, OSRM
// busy) the straight-line distance is scaled up to a typical road distance instead.

export type BusEta = {
  distanceMeters: number;
  durationSeconds: number;
  /** "road" = routed along roads; "estimate" = straight-line guess; "here" = bus is at the student. */
  source: "road" | "estimate" | "here";
  /** Road route from the bus to the student as [lat, lng] pairs (only for "road"). */
  route: [number, number][] | null;
};

const ARRIVED_WITHIN_M = 120;
const BUS_SLOWDOWN = 1.3;
const ROAD_FACTOR = 1.35;
const FALLBACK_SPEED_MS = 25 / 3.6;
const MIN_GAP_MS = 1000;
const CACHE_MS = 2 * 60 * 1000;
const MAX_QUEUE = 8;

type Route = { distance: number; duration: number; route: [number, number][] };

const globalForEta = globalThis as unknown as {
  busEta?: { cache: Map<string, { value: Route | null; at: number }>; lastCallAt: number; queue: number };
};
const state = (globalForEta.busEta ??= { cache: new Map(), lastCallAt: 0, queue: 0 });

const cellOf = (lat: number, lng: number) => `${lat.toFixed(3)},${lng.toFixed(3)}`;

async function osrmRoute(fromLat: number, fromLng: number, toLat: number, toLng: number): Promise<Route | null> {
  const key = `${cellOf(fromLat, fromLng)}>${cellOf(toLat, toLng)}`;
  const hit = state.cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.value;
  if (state.queue >= MAX_QUEUE) return null;

  // One request at a time, at most one per second (the public OSRM server's usage policy).
  state.queue++;
  try {
    const wait = state.lastCallAt + MIN_GAP_MS - Date.now();
    state.lastCallAt = Math.max(Date.now(), state.lastCallAt + MIN_GAP_MS);
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));

    const res = await fetch(
      `https://router.project-osrm.org/route/v1/driving/${fromLng},${fromLat};${toLng},${toLat}?overview=simplified&geometries=geojson&alternatives=false&steps=false`,
      { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(6000) }
    );
    let value: Route | null = null;
    if (res.ok) {
      const data = (await res.json()) as {
        code?: string;
        routes?: { distance: number; duration: number; geometry?: { coordinates?: [number, number][] } }[];
      };
      const r = data.code === "Ok" ? data.routes?.[0] : undefined;
      if (r && Number.isFinite(r.distance) && Number.isFinite(r.duration)) {
        value = {
          distance: r.distance,
          duration: r.duration,
          route: (r.geometry?.coordinates ?? []).map(([lng, lat]) => [lat, lng] as [number, number]),
        };
      }
    }
    state.cache.set(key, { value, at: Date.now() });
    if (state.cache.size > 2000) {
      for (const [k, v] of state.cache) if (Date.now() - v.at > CACHE_MS) state.cache.delete(k);
    }
    return value;
  } catch {
    return null;
  } finally {
    state.queue--;
  }
}

export async function estimateArrival(
  bus: { lat: number; lng: number },
  student: { lat: number; lng: number }
): Promise<BusEta> {
  const straight = haversineMeters(bus.lat, bus.lng, student.lat, student.lng);
  if (straight <= ARRIVED_WITHIN_M) {
    return { distanceMeters: straight, durationSeconds: 0, source: "here", route: null };
  }

  const road = await osrmRoute(bus.lat, bus.lng, student.lat, student.lng);
  if (road) {
    return {
      distanceMeters: road.distance,
      durationSeconds: Math.round(road.duration * BUS_SLOWDOWN),
      source: "road",
      route: road.route,
    };
  }

  const distance = straight * ROAD_FACTOR;
  return {
    distanceMeters: distance,
    durationSeconds: Math.round(distance / FALLBACK_SPEED_MS),
    source: "estimate",
    route: null,
  };
}
