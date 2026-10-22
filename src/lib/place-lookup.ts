import "server-only";

// Area / village name of a bus position, via OpenStreetMap's Nominatim. Looked up on the
// server so every student watching the same bus shares one lookup: positions are bucketed
// into ~110 m cells, each cell is resolved once, and requests go out one at a time no
// faster than Nominatim's usage policy allows (1 per second).

export type BusPlace = {
  /** Locality / road the bus is on, e.g. "Shivaji Nagar". */
  area: string | null;
  /** Village / town, e.g. "Wagholi". */
  village: string | null;
  /** Taluka / district level, e.g. "Haveli". */
  region: string | null;
  fullAddress: string | null;
};

const MIN_GAP_MS = 1100;
const MAX_CACHE = 5000;
const FAILED_RETRY_MS = 5 * 60 * 1000;
const USER_AGENT = "SchoolBusLiveTracking/1.0 (school management app; student bus tracking)";

type Entry = { place: BusPlace | null; at: number };

const globalForPlaces = globalThis as unknown as {
  busPlaces?: {
    cache: Map<string, Entry>;
    pending: Map<string, { lat: number; lng: number; done: (() => void)[] }>;
    running: boolean;
  };
};
const state = (globalForPlaces.busPlaces ??= { cache: new Map(), pending: new Map(), running: false });

const cellOf = (lat: number, lng: number) => `${lat.toFixed(3)},${lng.toFixed(3)}`;

type NominatimAddress = Record<string, string | undefined>;

function toPlace(data: { address?: NominatimAddress; display_name?: string }): BusPlace | null {
  const a = data.address ?? {};
  const village = a.village || a.town || a.city || a.municipality || a.suburb || null;
  let area = a.neighbourhood || a.quarter || a.hamlet || a.residential || a.suburb || a.road || null;
  if (area && area === village) area = a.road || null;
  const region = a.county || a.state_district || null;
  if (!area && !village) {
    const parts = data.display_name?.split(",").map((p) => p.trim()).filter(Boolean) ?? [];
    if (!parts.length) return null;
    return { area: parts[0] ?? null, village: parts[1] ?? null, region, fullAddress: data.display_name ?? null };
  }
  return { area, village, region: region === village ? null : region, fullAddress: data.display_name ?? null };
}

async function reverseGeocode(lat: number, lng: number): Promise<BusPlace | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=17&addressdetails=1&accept-language=en&lat=${lat}&lon=${lng}`,
      { headers: { Accept: "application/json", "User-Agent": USER_AGENT }, signal: AbortSignal.timeout(8000) }
    );
    if (!res.ok) return null;
    return toPlace(await res.json());
  } catch {
    return null;
  }
}

async function drain() {
  if (state.running) return;
  state.running = true;
  try {
    while (state.pending.size) {
      const [key, job] = state.pending.entries().next().value!;
      const place = await reverseGeocode(job.lat, job.lng);
      state.cache.set(key, { place, at: Date.now() });
      state.pending.delete(key);
      if (state.cache.size > MAX_CACHE) {
        // Map keeps insertion order — drop the oldest tenth.
        const drop = Math.ceil(MAX_CACHE / 10);
        for (const k of [...state.cache.keys()].slice(0, drop)) state.cache.delete(k);
      }
      for (const done of job.done) done();
      await new Promise((r) => setTimeout(r, MIN_GAP_MS));
    }
  } finally {
    state.running = false;
  }
}

/**
 * The place at this position if it's already known; otherwise starts a lookup and returns
 * undefined, calling `onResolved` once the name is in (so the caller can push it out).
 * Null means the lookup ran and found nothing (offline, no OSM data).
 */
export function placeAt(lat: number, lng: number, onResolved?: () => void): BusPlace | null | undefined {
  const key = cellOf(lat, lng);
  const hit = state.cache.get(key);
  if (hit && (hit.place || Date.now() - hit.at < FAILED_RETRY_MS)) return hit.place;

  const job = state.pending.get(key);
  if (job) {
    if (onResolved && job.done.length < 50) job.done.push(onResolved);
  } else {
    state.pending.set(key, { lat, lng, done: onResolved ? [onResolved] : [] });
    void drain();
  }
  return hit?.place;
}
