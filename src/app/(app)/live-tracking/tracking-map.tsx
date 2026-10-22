"use client";

import "leaflet/dist/leaflet.css";
import "./tracking-map.css";
import { useEffect, useRef, useState } from "react";
import type * as Leaflet from "leaflet";
import { cn } from "@/lib/utils";
import {
  formatClock,
  formatDuration,
  haversineMeters,
  latestPoint,
  splitPathOnGaps,
  type LiveState,
  type Stop,
  type TrackPoint,
} from "@/lib/tracking";

type L = typeof Leaflet;

export type MapTrip = {
  id: string;
  label: string;
  points: TrackPoint[];
  stops: Stop[];
  /** Live trips get a moving bus marker; finished ones an "E" end pin. */
  live: boolean;
};

export type MapFocus = { lat: number; lng: number; key: number };

type TripLayers = {
  casing: Leaflet.Polyline;
  line: Leaflet.Polyline;
  gaps: Leaflet.Polyline;
  start: Leaflet.Marker | null;
  head: Leaflet.Marker | null;
  headPos: [number, number] | null;
  heading: number | null;
  /** Rotation actually applied, unwrapped so the bus turns the short way (350° → 10° is +20°). */
  rotation: number;
  anim: number | null;
  stops: Leaflet.LayerGroup;
  stopsKey: string;
};

const PATH_COLOR = "#16a34a";
const GAP_COLOR = "#6b7280";
const DEFAULT_CENTER: [number, number] = [19.7515, 75.7139]; // Maharashtra
const ANIMATION_MS = 900;
/** Jumps longer than this aren't animated (the bus didn't really drive across the map in a second). */
const MAX_ANIMATED_JUMP_M = 1500;

const BUS_WINDOWS = [12.2, 18.5, 24.8, 31.1, 37.4, 43.7]
  .map((y) => `<rect x="2.7" y="${y}" width="2.1" height="4.6" rx=".8"/><rect x="19.2" y="${y}" width="2.1" height="4.6" rx=".8"/>`)
  .join("");

/** A yellow school bus seen from above, front pointing up; rotated to the way the bus drives. */
const BUS_SVG =
  '<svg class="tm-bus-arrow" viewBox="0 0 24 52" aria-hidden="true">' +
  '<g fill="#111827"><rect x=".4" y="8.5" width="3" height="7.5" rx="1.2"/><rect x="20.6" y="8.5" width="3" height="7.5" rx="1.2"/>' +
  '<rect x=".4" y="37.5" width="3" height="7.5" rx="1.2"/><rect x="20.6" y="37.5" width="3" height="7.5" rx="1.2"/></g>' +
  '<rect x="2" y="1" width="20" height="50" rx="5" fill="#fbbf24" stroke="#92400e" stroke-width=".9"/>' +
  '<path d="M4.3 9.4 5.1 4.4Q12 2.9 18.9 4.4L19.7 9.4Q12 8.4 4.3 9.4Z" fill="#263445"/>' +
  '<path d="M7 7.6 9.4 4.6" stroke="#fff" stroke-opacity=".4" stroke-width=".9" stroke-linecap="round"/>' +
  '<rect x="5.6" y="12" width="12.8" height="33.4" rx="2.6" fill="#fde68a"/>' +
  '<rect x="9" y="21.5" width="6" height="7" rx="1.2" fill="#f59e0b" fill-opacity=".6"/>' +
  '<path d="M12 13.5v7M12 29.5V44" stroke="#b45309" stroke-opacity=".33" stroke-width=".7"/>' +
  `<g fill="#263445">${BUS_WINDOWS}<rect x="6.4" y="46.4" width="11.2" height="2.6" rx="1"/></g>` +
  '<circle cx="5.6" cy="2.7" r="1.15" fill="#fffbeb"/><circle cx="18.4" cy="2.7" r="1.15" fill="#fffbeb"/>' +
  '<rect x="3.4" y="49.2" width="2.6" height="1.3" rx=".5" fill="#dc2626"/><rect x="18" y="49.2" width="2.6" height="1.3" rx=".5" fill="#dc2626"/>' +
  "</svg>";

/** `next` degrees as an angle close to `previous`, so a CSS rotation takes the short way round. */
function unwrapDegrees(previous: number, next: number): number {
  const delta = ((((next - previous) % 360) + 540) % 360) - 180;
  return previous + delta;
}

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

function bearing(a: TrackPoint, b: TrackPoint): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const y = Math.sin(toRad(b.lng - a.lng)) * Math.cos(toRad(b.lat));
  const x =
    Math.cos(toRad(a.lat)) * Math.sin(toRad(b.lat)) -
    Math.sin(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.cos(toRad(b.lng - a.lng));
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

/** Direction the bus is facing: GPS heading while moving, else the last movement direction. */
function headingOf(points: TrackPoint[], previous: number | null): number | null {
  const last = points[points.length - 1];
  if (!last) return previous;
  if (last.heading != null && (last.speed ?? 0) > 1) return last.heading;
  for (let i = points.length - 2; i >= Math.max(0, points.length - 10); i--) {
    if (haversineMeters(points[i].lat, points[i].lng, last.lat, last.lng) > 8) {
      return bearing(points[i], last);
    }
  }
  return previous;
}

export function TrackingMap({
  trips,
  states,
  selectedId,
  onSelect,
  follow = false,
  onUserPan,
  fitKey,
  focus,
  cursor,
  className,
}: {
  trips: MapTrip[];
  /** Live state per trip id — colours the bus marker. */
  states?: Record<string, LiveState>;
  selectedId: string | null;
  onSelect?: (id: string) => void;
  /** Keep the selected bus centred as it moves. */
  follow?: boolean;
  /** Fired when the user drags the map (so the page can switch "follow" off). */
  onUserPan?: () => void;
  /** Change to re-fit the view to the selected trip (or everything). */
  fitKey?: string | number;
  focus?: MapFocus | null;
  /** Replay position — a bus marker at this fix (trip history scrubber). */
  cursor?: { lat: number; lng: number; heading: number | null; label: string } | null;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState<{ L: L; map: Leaflet.Map } | null>(null);
  const layersRef = useRef(new Map<string, TripLayers>());
  const didInitialFit = useRef(false);
  // Leaflet handlers are bound once; they read the latest callbacks through this ref.
  const callbacks = useRef({ onSelect, onUserPan });
  useEffect(() => {
    callbacks.current = { onSelect, onUserPan };
  });

  // Leaflet touches `window` on import, so it's loaded only in the browser.
  useEffect(() => {
    let cancelled = false;
    let map: Leaflet.Map | null = null;
    let observer: ResizeObserver | null = null;
    const layers = layersRef.current;

    (async () => {
      const mod = await import("leaflet");
      const L = ((mod as unknown as { default?: L }).default ?? mod) as L;
      if (cancelled || !containerRef.current) return;

      map = L.map(containerRef.current, { zoomControl: true, attributionControl: true }).setView(
        DEFAULT_CENTER,
        7
      );
      const streets = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);
      const satellite = L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        { maxZoom: 19, attribution: "Imagery &copy; Esri" }
      );
      L.control.layers({ Map: streets, Satellite: satellite }, undefined, { position: "topright" }).addTo(map);
      L.control.scale({ imperial: false }).addTo(map);
      map.on("dragstart", () => callbacks.current.onUserPan?.());

      observer = new ResizeObserver(() => map?.invalidateSize());
      observer.observe(containerRef.current);
      setReady({ L, map });
    })();

    return () => {
      cancelled = true;
      observer?.disconnect();
      for (const l of layers.values()) if (l.anim != null) cancelAnimationFrame(l.anim);
      layers.clear();
      map?.remove();
      didInitialFit.current = false;
      setReady(null);
    };
  }, []);

  // Draw / update every trip's path, start pin, bus (or end pin) and stop markers.
  useEffect(() => {
    if (!ready) return;
    const { L, map } = ready;
    const layers = layersRef.current;
    const wanted = new Set(trips.map((t) => t.id));

    for (const [id, l] of layers) {
      if (wanted.has(id)) continue;
      if (l.anim != null) cancelAnimationFrame(l.anim);
      [l.casing, l.line, l.gaps, l.stops, l.start, l.head].forEach((layer) => layer && map.removeLayer(layer));
      layers.delete(id);
    }

    const showStopsFor = trips.length === 1 ? trips[0].id : selectedId;

    for (const trip of trips) {
      const selected = trip.id === selectedId;
      let l = layers.get(trip.id);
      if (!l) {
        const select = () => callbacks.current.onSelect?.(trip.id);
        l = {
          casing: L.polyline([], { color: "#14532d", weight: 9, opacity: 0.25, interactive: false }).addTo(map),
          line: L.polyline([], { color: PATH_COLOR, weight: 5, lineCap: "round", lineJoin: "round" })
            .on("click", select)
            .addTo(map),
          gaps: L.polyline([], { color: GAP_COLOR, weight: 3, dashArray: "6 8", interactive: false }).addTo(map),
          start: null,
          head: null,
          headPos: null,
          heading: null,
          rotation: 0,
          anim: null,
          stops: L.layerGroup().addTo(map),
          stopsKey: "",
        };
        layers.set(trip.id, l);
      }

      const { segments, gaps } = splitPathOnGaps(trip.points);
      const latlngs = segments.map((seg) => seg.map((p) => [p.lat, p.lng] as [number, number]));
      l.casing.setLatLngs(latlngs);
      l.line.setLatLngs(latlngs);
      l.gaps.setLatLngs(gaps.map(([a, b]) => [[a.lat, a.lng], [b.lat, b.lng]] as [number, number][]));
      l.line.setStyle({ opacity: selectedId && !selected ? 0.5 : 0.95, weight: selected ? 6 : 5 });
      l.casing.setStyle({ opacity: selectedId && !selected ? 0.1 : 0.25 });
      if (selected) l.line.bringToFront();

      // Start pin
      const first = trip.points.find((p) => p.accuracy == null || p.accuracy <= 75) ?? trip.points[0];
      if (first) {
        if (!l.start) {
          l.start = L.marker([first.lat, first.lng], {
            icon: L.divIcon({
              className: "tm-icon",
              html: '<div class="tm-pin tm-pin-start"><span>S</span></div>',
              iconSize: [26, 26],
              iconAnchor: [13, 30],
            }),
            zIndexOffset: 100,
          })
            .bindTooltip(`Start · ${escapeHtml(trip.label)} · ${formatClock(first.t)}`)
            .addTo(map);
        } else {
          l.start.setLatLng([first.lat, first.lng]);
          l.start.setTooltipContent(`Start · ${escapeHtml(trip.label)} · ${formatClock(first.t)}`);
        }
      }

      // Bus marker (live) or end pin (finished)
      const last = latestPoint(trip.points);
      if (last) {
        const target: [number, number] = [last.lat, last.lng];
        if (!l.head) {
          l.head = L.marker(target, {
            icon: trip.live
              ? L.divIcon({
                  className: "tm-icon",
                  // data-state is filled in by the states effect below, in the same commit.
                  html: `<div class="tm-bus" data-state="waiting"><span class="tm-bus-pulse"></span><span class="tm-bus-body">${BUS_SVG}</span><span class="tm-bus-label">${escapeHtml(trip.label)}</span></div>`,
                  iconSize: [56, 56],
                  iconAnchor: [28, 28],
                })
              : L.divIcon({
                  className: "tm-icon",
                  html: '<div class="tm-pin tm-pin-end"><span>E</span></div>',
                  iconSize: [26, 26],
                  iconAnchor: [13, 30],
                }),
            zIndexOffset: trip.live ? 1000 : 200,
          })
            .on("click", () => callbacks.current.onSelect?.(trip.id))
            .addTo(map);
          if (!trip.live) l.head.bindTooltip(`End · ${formatClock(last.t)}`);
          l.headPos = target;
        } else if (!l.headPos || l.headPos[0] !== target[0] || l.headPos[1] !== target[1]) {
          animateMarker(l, target);
        }

        if (trip.live) {
          l.heading = headingOf(trip.points, l.heading);
          const el = l.head.getElement()?.querySelector<HTMLElement>(".tm-bus");
          if (el) {
            el.dataset.selected = String(selected);
            const arrow = el.querySelector<SVGElement>(".tm-bus-arrow");
            if (arrow && l.heading != null) {
              l.rotation = unwrapDegrees(l.rotation, l.heading);
              arrow.style.transform = `rotate(${l.rotation}deg)`;
            }
          }
          l.head.setZIndexOffset(selected ? 2000 : 1000);
        } else {
          l.head.setTooltipContent(`End · ${formatClock(last.t)}`);
        }
      }

      // Stops — only for the trip in focus, so several buses don't bury the map in pins.
      const stopsToShow = trip.id === showStopsFor ? trip.stops : [];
      const stopsKey = stopsToShow.map((s) => `${s.startT}-${s.endT}-${s.ongoing}`).join("|");
      if (stopsKey !== l.stopsKey) {
        l.stopsKey = stopsKey;
        l.stops.clearLayers();
        stopsToShow.forEach((s, i) => {
          const duration = formatDuration(s.durationMs);
          const popup = `<div class="tm-popup"><strong>Stop ${i + 1} · ${duration}${s.ongoing ? " (standing now)" : ""}</strong>${formatClock(s.startT)} – ${s.ongoing ? "now" : formatClock(s.endT)}<br/><a href="https://www.google.com/maps?q=${s.lat.toFixed(6)},${s.lng.toFixed(6)}" target="_blank" rel="noopener noreferrer">Open in Google Maps</a></div>`;
          L.marker([s.lat, s.lng], {
            icon: L.divIcon({
              className: "tm-icon",
              html: `<div class="tm-stop" data-ongoing="${s.ongoing}"><span class="tm-stop-dot">${i + 1}</span><span class="tm-stop-label">${duration}</span></div>`,
              iconSize: [22, 22],
              iconAnchor: [11, 11],
            }),
            zIndexOffset: 500,
          })
            .bindPopup(popup)
            .addTo(l.stops);
        });
      }
    }

    // First data → frame everything once.
    if (!didInitialFit.current) {
      const all = trips.flatMap((t) => t.points.map((p) => [p.lat, p.lng] as [number, number]));
      if (all.length) {
        didInitialFit.current = true;
        if (all.length === 1) map.setView(all[0], 16);
        else map.fitBounds(L.latLngBounds(all), { padding: [48, 48], maxZoom: 17 });
      }
    }

    /** Glides the bus from where it's drawn now to its new fix instead of teleporting. */
    function animateMarker(l: TripLayers, target: [number, number]) {
      const marker = l.head!;
      if (l.anim != null) cancelAnimationFrame(l.anim);
      const current = marker.getLatLng();
      const from: [number, number] = [current.lat, current.lng];
      l.headPos = target;
      if (haversineMeters(from[0], from[1], target[0], target[1]) > MAX_ANIMATED_JUMP_M || document.hidden) {
        marker.setLatLng(target);
        l.anim = null;
        return;
      }
      const started = performance.now();
      const step = (now: number) => {
        const k = Math.min(1, (now - started) / ANIMATION_MS);
        const ease = k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2;
        marker.setLatLng([from[0] + (target[0] - from[0]) * ease, from[1] + (target[1] - from[1]) * ease]);
        l.anim = k < 1 ? requestAnimationFrame(step) : null;
      };
      l.anim = requestAnimationFrame(step);
    }
  }, [ready, trips, selectedId]);

  // Marker colour per live state (moving / stopped / no signal). Keyed by content, so the
  // parent's per-second re-render doesn't touch the map unless a bus actually changed state.
  const statesKey = JSON.stringify(states ?? {});
  useEffect(() => {
    if (!ready) return;
    const current = JSON.parse(statesKey) as Record<string, LiveState>;
    for (const [id, l] of layersRef.current) {
      const el = l.head?.getElement()?.querySelector<HTMLElement>(".tm-bus");
      if (el && current[id]) el.dataset.state = current[id];
    }
  }, [ready, statesKey, trips]);

  // Follow the selected bus.
  useEffect(() => {
    if (!ready || !follow || !selectedId) return;
    const l = layersRef.current.get(selectedId);
    if (l?.headPos) ready.map.panTo(l.headPos, { animate: true, duration: 0.8 });
  }, [ready, follow, selectedId, trips]);

  // Explicit re-fit (selection changed, "fit" button).
  useEffect(() => {
    if (!ready || fitKey === undefined) return;
    const { L, map } = ready;
    const source = selectedId ? trips.filter((t) => t.id === selectedId) : trips;
    const all = source.flatMap((t) => t.points.map((p) => [p.lat, p.lng] as [number, number]));
    if (all.length === 1) map.setView(all[0], 16);
    else if (all.length > 1) map.fitBounds(L.latLngBounds(all), { padding: [48, 48], maxZoom: 17 });
    // Re-fit only when asked, not on every new point.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, fitKey]);

  useEffect(() => {
    if (!ready || !focus) return;
    ready.map.flyTo([focus.lat, focus.lng], Math.max(ready.map.getZoom(), 17), { duration: 0.8 });
  }, [ready, focus]);

  const cursorRef = useRef<Leaflet.Marker | null>(null);
  const cursorRotation = useRef(0);
  useEffect(() => {
    if (!ready) return;
    const { L, map } = ready;
    if (!cursor) {
      cursorRef.current?.remove();
      cursorRef.current = null;
      return;
    }
    // hasLayer: after a map re-init (dev strict mode) the old marker belongs to a removed map.
    if (!cursorRef.current || !map.hasLayer(cursorRef.current)) {
      cursorRef.current = L.marker([cursor.lat, cursor.lng], {
        icon: L.divIcon({
          className: "tm-icon",
          html: `<div class="tm-bus" data-state="waiting" data-selected="true"><span class="tm-bus-body">${BUS_SVG}</span><span class="tm-bus-label"></span></div>`,
          iconSize: [56, 56],
          iconAnchor: [28, 28],
        }),
        zIndexOffset: 3000,
        interactive: false,
      }).addTo(map);
    } else {
      cursorRef.current.setLatLng([cursor.lat, cursor.lng]);
    }
    const el = cursorRef.current.getElement();
    const label = el?.querySelector<HTMLElement>(".tm-bus-label");
    if (label) label.textContent = cursor.label;
    const arrow = el?.querySelector<SVGElement>(".tm-bus-arrow");
    if (arrow && cursor.heading != null) {
      cursorRotation.current = unwrapDegrees(cursorRotation.current, cursor.heading);
      arrow.style.transform = `rotate(${cursorRotation.current}deg)`;
    }
    const bounds = map.getBounds();
    if (!bounds.contains([cursor.lat, cursor.lng])) map.panTo([cursor.lat, cursor.lng]);
  }, [ready, cursor]);

  return <div ref={containerRef} className={cn("tm-map h-full w-full bg-muted", className)} />;
}
