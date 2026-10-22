// Live tracking helpers shared by the server (API + pages) and the browser (live map).
// Pure functions only — no Prisma, no DOM.

/** One GPS fix. `t` is the phone's fix time in epoch milliseconds. */
export type TrackPoint = {
  lat: number;
  lng: number;
  t: number;
  speed: number | null; // m/s
  heading: number | null; // degrees, 0 = north
  accuracy: number | null; // meters
};

/** Compact wire format for a point: [lat, lng, t, speed, heading, accuracy]. */
export type WirePoint = [number, number, number, number | null, number | null, number | null];

export type TripSummary = {
  id: string;
  driverId: string;
  driverName: string;
  busId: string | null;
  vehicleNumber: string;
  direction: "TO_SCHOOL" | "TO_HOME";
  status: "ACTIVE" | "COMPLETED";
  startedAt: number;
  endedAt: number | null;
  lastPointAt: number | null;
  lastLat: number | null;
  lastLng: number | null;
  lastSpeed: number | null;
  lastHeading: number | null;
  lastAccuracy: number | null;
  distanceMeters: number | null;
};

/**
 * Payload of both the SSE stream and the polling endpoint. A "snapshot" replaces the
 * client's state; a "delta" is merged into it (points are de-duplicated by `t`).
 */
export type TrackingFeed = {
  type: "snapshot" | "delta";
  cursor: number;
  serverTime: number;
  trips: TripSummary[];
  points: Record<string, WirePoint[]>;
};

export type Stop = {
  lat: number;
  lng: number;
  startT: number;
  endT: number;
  durationMs: number;
  /** The bus is still standing here (the stop runs up to the latest point of a live trip). */
  ongoing: boolean;
};

export const TIME_ZONE = "Asia/Kolkata";

/** Fixes worse than this are too noisy to draw or to use for stop detection. */
export const MAX_USABLE_ACCURACY_M = 75;
/** No point for this long → the phone has lost signal / the app was killed. */
export const SIGNAL_LOST_AFTER_MS = 60_000;
/** Below this speed (≈3.6 km/h) a bus counts as standing still. */
export const MOVING_SPEED_MS = 1;

const round = (n: number, digits: number) => {
  const f = 10 ** digits;
  return Math.round(n * f) / f;
};

export function toWirePoint(p: TrackPoint): WirePoint {
  return [
    round(p.lat, 6),
    round(p.lng, 6),
    p.t,
    p.speed == null ? null : round(p.speed, 2),
    p.heading == null ? null : round(p.heading, 1),
    p.accuracy == null ? null : round(p.accuracy, 1),
  ];
}

export function fromWirePoint(w: WirePoint): TrackPoint {
  return { lat: w[0], lng: w[1], t: w[2], speed: w[3], heading: w[4], accuracy: w[5] };
}

const EARTH_RADIUS_M = 6_371_000;
const toRad = (deg: number) => (deg * Math.PI) / 180;

/** Great-circle distance in meters. */
export function haversineMeters(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function isUsable(p: TrackPoint): boolean {
  return p.accuracy == null || p.accuracy <= MAX_USABLE_ACCURACY_M;
}

/** A lone fix that jumps away and the very next one comes straight back: a GPS glitch, not a detour. */
const SPIKE_MIN_JUMP_M = 30;

/**
 * Fixes worth drawing and measuring: drops inaccurate readings and one-point GPS spikes
 * (A → far-off B → back near A), which would otherwise draw a spike on the map and add
 * phantom distance. The newest fix is always kept — there's nothing after it to judge it by.
 */
export function cleanPath(points: TrackPoint[]): TrackPoint[] {
  const pts = points.filter(isUsable);
  if (pts.length < 3) return pts;
  const out: TrackPoint[] = [pts[0]];
  for (let i = 1; i < pts.length - 1; i++) {
    const a = out[out.length - 1];
    const b = pts[i];
    const c = pts[i + 1];
    const ab = haversineMeters(a.lat, a.lng, b.lat, b.lng);
    const bc = haversineMeters(b.lat, b.lng, c.lat, c.lng);
    const ac = haversineMeters(a.lat, a.lng, c.lat, c.lng);
    if (ab > SPIKE_MIN_JUMP_M && bc > SPIKE_MIN_JUMP_M && ac < 0.5 * Math.min(ab, bc)) continue;
    out.push(b);
  }
  out.push(pts[pts.length - 1]);
  return out;
}

/**
 * Inserts `incoming` into the time-sorted `existing` list, skipping fixes already present
 * (same `t`). Returns the same array instance when nothing new was added.
 */
export function mergePoints(existing: TrackPoint[], incoming: TrackPoint[]): TrackPoint[] {
  if (incoming.length === 0) return existing;
  const seen = new Set(existing.map((p) => p.t));
  const fresh = incoming.filter((p) => {
    if (seen.has(p.t)) return false;
    seen.add(p.t);
    return true;
  });
  if (fresh.length === 0) return existing;

  const lastT = existing.length ? existing[existing.length - 1].t : -Infinity;
  fresh.sort((a, b) => a.t - b.t);
  // Common case: new fixes are all newer than what we have — just append.
  if (fresh[0].t > lastT) return existing.concat(fresh);
  return existing.concat(fresh).sort((a, b) => a.t - b.t);
}

/**
 * Distance travelled along the path. GPS jitter while parked would otherwise add up to
 * kilometres, so a segment only counts once the bus has moved clearly away from the last
 * counted fix.
 */
export function pathDistanceMeters(points: TrackPoint[]): number {
  let total = 0;
  let anchor: TrackPoint | null = null;
  for (const p of cleanPath(points)) {
    if (!anchor) {
      anchor = p;
      continue;
    }
    const d = haversineMeters(anchor.lat, anchor.lng, p.lat, p.lng);
    const threshold = Math.min(30, Math.max(12, ((anchor.accuracy ?? 10) + (p.accuracy ?? 10)) / 2));
    if (d >= threshold) {
      total += d;
      anchor = p;
    }
  }
  return total;
}

/**
 * Finds places where the bus stood still for at least `minDurationMs`.
 *
 * Walks the time-sorted fixes and grows a cluster while each next fix stays within
 * `radiusM` of the cluster's running centre. A couple of stray fixes (GPS jumps) are
 * tolerated so one bad reading doesn't split a stop in two. Fixes at the cluster's edges
 * that still report driving speed (approaching / pulling away) are trimmed off, so the stop
 * lasts from the first to the last fix where the bus actually stood — the app keeps sending
 * a fix every few seconds while parked, so this is accurate to within that heartbeat.
 */
export function detectStops(
  points: TrackPoint[],
  { radiusM = 40, minDurationMs = 60_000, maxOutliers = 2, live = false } = {}
): Stop[] {
  const pts = cleanPath(points);
  const stops: Stop[] = [];
  const driving = (p: TrackPoint) => p.speed != null && p.speed > MOVING_SPEED_MS;
  let i = 0;

  while (i < pts.length) {
    let sumLat = pts[i].lat;
    let sumLng = pts[i].lng;
    let count = 1;
    let lastIn = i;
    let outliers = 0;

    for (let j = i + 1; j < pts.length; j++) {
      const d = haversineMeters(sumLat / count, sumLng / count, pts[j].lat, pts[j].lng);
      if (d <= radiusM) {
        sumLat += pts[j].lat;
        sumLng += pts[j].lng;
        count++;
        lastIn = j;
        outliers = 0;
      } else if (++outliers > maxOutliers) {
        break;
      }
    }

    let first = i;
    let last = lastIn;
    while (first < last && driving(pts[first])) first++;
    while (last > first && driving(pts[last])) last--;

    const durationMs = pts[last].t - pts[first].t;
    if (durationMs >= minDurationMs) {
      let lat = 0;
      let lng = 0;
      for (let k = first; k <= last; k++) {
        lat += pts[k].lat;
        lng += pts[k].lng;
      }
      const n = last - first + 1;
      stops.push({
        lat: lat / n,
        lng: lng / n,
        startT: pts[first].t,
        endT: pts[last].t,
        durationMs,
        ongoing: live && lastIn === pts.length - 1,
      });
      i = lastIn + 1;
    } else {
      i++;
    }
  }

  return stops;
}

/**
 * Splits the path wherever the phone went quiet for a while and the bus reappeared far
 * away, so the map can draw those stretches as a dashed "no signal" line instead of
 * pretending the bus drove in a straight line.
 */
export function splitPathOnGaps(
  points: TrackPoint[],
  { gapMs = 90_000, gapMeters = 300 } = {}
): { segments: TrackPoint[][]; gaps: [TrackPoint, TrackPoint][] } {
  const pts = cleanPath(points);
  const segments: TrackPoint[][] = [];
  const gaps: [TrackPoint, TrackPoint][] = [];
  let current: TrackPoint[] = [];

  for (const p of pts) {
    const prev = current[current.length - 1];
    if (
      prev &&
      p.t - prev.t > gapMs &&
      haversineMeters(prev.lat, prev.lng, p.lat, p.lng) > gapMeters
    ) {
      segments.push(current);
      gaps.push([prev, p]);
      current = [];
    }
    current.push(p);
  }
  if (current.length) segments.push(current);
  return { segments, gaps };
}

/** Latest fix, preferring a usable one so a single noisy reading doesn't throw the bus off the road. */
export function latestPoint(points: TrackPoint[]): TrackPoint | null {
  for (let i = points.length - 1; i >= Math.max(0, points.length - 5); i--) {
    if (isUsable(points[i])) return points[i];
  }
  return points[points.length - 1] ?? null;
}

export type LiveState = "moving" | "stopped" | "no-signal" | "waiting";

export function liveStateOf(points: TrackPoint[], now: number, stops: Stop[]): LiveState {
  const last = points[points.length - 1];
  if (!last) return "waiting";
  if (now - last.t > SIGNAL_LOST_AFTER_MS) return "no-signal";
  if (stops.length && stops[stops.length - 1].ongoing) return "stopped";
  if (last.speed != null && last.speed < MOVING_SPEED_MS) return "stopped";
  return "moving";
}

export function formatDuration(ms: number): string {
  const totalSec = Math.max(0, Math.round(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h) return `${h} hr ${m} min`;
  if (m) return s && m < 10 ? `${m} min ${s} sec` : `${m} min`;
  return `${s} sec`;
}

export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(meters < 10_000 ? 2 : 1)} km`;
}

export function formatSpeedKmh(speedMs: number | null | undefined): string {
  if (speedMs == null || speedMs < 0) return "-";
  return `${Math.round(speedMs * 3.6)} km/h`;
}

/** "10:42 AM" in the school's time zone, identical on server and client (no hydration drift). */
export function formatClock(t: number | Date | null | undefined, withSeconds = false): string {
  if (t == null) return "-";
  return new Date(t).toLocaleTimeString("en-IN", {
    timeZone: TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    ...(withSeconds ? { second: "2-digit" } : {}),
    hour12: true,
  });
}

export function formatDayClock(t: number | Date | null | undefined): string {
  if (t == null) return "-";
  return new Date(t).toLocaleString("en-IN", {
    timeZone: TIME_ZONE,
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

export function formatAgo(t: number | null | undefined, now: number): string {
  if (t == null) return "never";
  const diff = Math.max(0, now - t);
  if (diff < 5_000) return "just now";
  if (diff < 60_000) return `${Math.floor(diff / 1000)} sec ago`;
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} min ago`;
  return `${Math.floor(diff / 3_600_000)} hr ago`;
}

/** YYYY-MM-DD of `t` in the school's time zone. */
export function dayKey(t: number | Date): string {
  return new Date(t).toLocaleDateString("en-CA", { timeZone: TIME_ZONE });
}

/** [start, end) of a YYYY-MM-DD day in the school's time zone (IST has no DST, so a fixed offset is exact). */
export function dayBounds(day: string): { start: Date; end: Date } | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
  const start = new Date(`${day}T00:00:00+05:30`);
  if (Number.isNaN(start.getTime())) return null;
  return { start, end: new Date(start.getTime() + 24 * 60 * 60 * 1000) };
}
