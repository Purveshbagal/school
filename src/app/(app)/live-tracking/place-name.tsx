"use client";

import { useEffect, useState } from "react";

// Reverse geocoding through OpenStreetMap's Nominatim. Its usage policy allows at most one
// request per second, so lookups go through a single queue, and results are cached (in
// memory and localStorage) by ~10 m grid cell so the same stop is only ever looked up once.

const CACHE_KEY = "live-tracking:places:v1";
const MIN_GAP_MS = 1100;

const memory = new Map<string, string | null>();
const waiters = new Map<string, ((name: string | null) => void)[]>();
const queue: { key: string; lat: number; lng: number }[] = [];
let running = false;
let storageLoaded = false;

function loadStorage() {
  if (storageLoaded) return;
  storageLoaded = true;
  try {
    const saved = JSON.parse(localStorage.getItem(CACHE_KEY) || "{}") as Record<string, string>;
    for (const [k, v] of Object.entries(saved)) memory.set(k, v);
  } catch {
    // storage unavailable / corrupt — lookups just won't be remembered across visits
  }
}

function saveStorage() {
  try {
    const entries = [...memory.entries()].filter((e): e is [string, string] => e[1] != null).slice(-500);
    localStorage.setItem(CACHE_KEY, JSON.stringify(Object.fromEntries(entries)));
  } catch {
    // ignore
  }
}

const keyOf = (lat: number, lng: number) => `${lat.toFixed(4)},${lng.toFixed(4)}`;

function shortName(data: {
  name?: string;
  display_name?: string;
  address?: Record<string, string>;
}): string | null {
  const a = data.address ?? {};
  const parts = [
    data.name || a.amenity || a.building || a.shop,
    a.road,
    a.neighbourhood || a.suburb || a.hamlet,
    a.village || a.town || a.city,
    a.county || a.state_district,
    a.state,
  ].filter((p): p is string => Boolean(p));
  const unique = parts.filter((p, i) => parts.indexOf(p) === i);
  if (unique.length) return unique.join(", ");
  return data.display_name?.trim() || null;
}

async function drain() {
  if (running) return;
  running = true;
  while (queue.length) {
    const job = queue.shift()!;
    let name: string | null = null;
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=18&addressdetails=1&accept-language=en&lat=${job.lat}&lon=${job.lng}`,
        { headers: { Accept: "application/json" } }
      );
      if (res.ok) name = shortName(await res.json());
    } catch {
      // offline / blocked — fall back to coordinates
    }
    memory.set(job.key, name);
    if (name) saveStorage();
    for (const done of waiters.get(job.key) ?? []) done(name);
    waiters.delete(job.key);
    await new Promise((r) => setTimeout(r, MIN_GAP_MS));
  }
  running = false;
}

function lookup(lat: number, lng: number, done: (name: string | null) => void): () => void {
  loadStorage();
  const key = keyOf(lat, lng);
  if (memory.has(key)) {
    done(memory.get(key) ?? null);
    return () => {};
  }
  const list = waiters.get(key);
  if (list) list.push(done);
  else {
    waiters.set(key, [done]);
    queue.push({ key, lat, lng });
    void drain();
  }
  return () => {
    const current = waiters.get(key);
    if (current) waiters.set(key, current.filter((fn) => fn !== done));
  };
}

export function PlaceName({ lat, lng, className }: { lat: number; lng: number; className?: string }) {
  const coords = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  const [name, setName] = useState<{ key: string; value: string | null } | null>(null);
  const key = keyOf(lat, lng);

  useEffect(() => lookup(lat, lng, (value) => setName({ key, value })), [lat, lng, key]);

  const resolved = name?.key === key ? name : null;
  return (
    <span className={className} title={coords}>
      {resolved ? resolved.value || coords : <span className="text-muted-foreground">Finding place…</span>}
    </span>
  );
}
