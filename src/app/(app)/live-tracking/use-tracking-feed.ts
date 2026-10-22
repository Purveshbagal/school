"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { fromWirePoint, mergePoints, type TrackPoint, type TrackingFeed, type TripSummary } from "@/lib/tracking";

export type LiveTrip = { summary: TripSummary; points: TrackPoint[] };
export type FeedStatus = "connecting" | "live" | "polling" | "reconnecting" | "unauthorized";

const POLL_MS = 2000;
/** No event (not even a heartbeat) for this long → the stream is stuck behind a proxy; poll instead. */
const STREAM_SILENCE_MS = 35_000;
/** How long a fresh stream may take to deliver its first snapshot before we give up on it. */
const STREAM_FIRST_EVENT_MS = 10_000;
/** While polling, try the stream again this often. */
const STREAM_RETRY_MS = 120_000;

/**
 * Live trips for the map. Uses the Server-Sent Events stream (updates pushed the moment a
 * phone reports in) and silently falls back to polling every 2 s if the stream can't stay
 * connected. Both deliver the same feed format, so switching modes never loses points.
 */
export function useTrackingFeed() {
  const [trips, setTrips] = useState<Map<string, LiveTrip>>(() => new Map());
  const [status, setStatus] = useState<FeedStatus>("connecting");
  const [loaded, setLoaded] = useState(false);
  const cursorRef = useRef<number | null>(null);
  /** serverTime − Date.now(); fix times are server-based, so "x sec ago" must be too. */
  const [clockOffset, setClockOffset] = useState(0);

  const apply = useCallback((feed: TrackingFeed) => {
    cursorRef.current = feed.cursor;
    setClockOffset(feed.serverTime - Date.now());
    setLoaded(true);
    setTrips((prev) => {
      const next = new Map<string, LiveTrip>();
      for (const summary of feed.trips) {
        const incoming = (feed.points[summary.id] ?? []).map(fromWirePoint);
        const before = feed.type === "delta" ? prev.get(summary.id) : undefined;
        next.set(summary.id, { summary, points: mergePoints(before?.points ?? [], incoming) });
      }
      return next;
    });
  }, []);

  useEffect(() => {
    let disposed = false;
    let source: EventSource | null = null;
    let lastEventAt = 0;
    let streamOpenedAt = 0;
    let streamDelivered = false;
    let pollTimer: ReturnType<typeof setTimeout> | null = null;
    let polling = false;
    let lastStreamAttempt = 0;
    let unauthorized = false;

    const closeStream = () => {
      source?.close();
      source = null;
    };

    const poll = async () => {
      pollTimer = null;
      if (disposed || !polling) return;
      try {
        const since = cursorRef.current;
        const res = await fetch(`/api/tracking/live${since != null ? `?since=${since}` : ""}`, {
          cache: "no-store",
        });
        if (disposed) return;
        if (res.status === 401) {
          unauthorized = true;
          polling = false;
          closeStream();
          setStatus("unauthorized");
          return;
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        apply((await res.json()) as TrackingFeed);
        setStatus(source && streamDelivered ? "live" : "polling");
      } catch {
        if (!disposed && !source) setStatus("reconnecting");
      }
      if (!disposed && polling) pollTimer = setTimeout(poll, POLL_MS);
    };

    const startPolling = () => {
      if (polling) return;
      polling = true;
      if (!pollTimer) void poll();
    };
    const stopPolling = () => {
      polling = false;
      if (pollTimer) clearTimeout(pollTimer);
      pollTimer = null;
    };

    const openStream = () => {
      if (disposed || unauthorized || source || typeof EventSource === "undefined") return;
      lastStreamAttempt = Date.now();
      streamOpenedAt = Date.now();
      streamDelivered = false;
      const es = new EventSource("/api/tracking/stream");
      source = es;

      const onFeed = (e: MessageEvent<string>) => {
        lastEventAt = Date.now();
        streamDelivered = true;
        try {
          apply(JSON.parse(e.data) as TrackingFeed);
        } catch {
          return;
        }
        setStatus("live");
        stopPolling();
      };
      es.addEventListener("snapshot", onFeed as EventListener);
      es.addEventListener("delta", onFeed as EventListener);
      es.addEventListener("ping", () => {
        lastEventAt = Date.now();
      });
      es.addEventListener("feed-error", () => setStatus("reconnecting"));
      es.onerror = () => {
        if (disposed) return;
        // CLOSED = the server refused (e.g. logged out); CONNECTING = the browser is
        // already retrying. Either way keep data flowing through polling meanwhile.
        if (es.readyState === EventSource.CLOSED) closeStream();
        setStatus("reconnecting");
        startPolling();
      };
    };

    // Quick first paint from a plain request, then switch to the stream.
    polling = true;
    void poll().then(openStream);

    const watchdog = setInterval(() => {
      if (disposed || unauthorized) return;
      const now = Date.now();
      if (source) {
        const stuck = streamDelivered
          ? now - lastEventAt > STREAM_SILENCE_MS
          : now - streamOpenedAt > STREAM_FIRST_EVENT_MS;
        if (stuck) {
          closeStream();
          startPolling();
        }
      } else if (now - lastStreamAttempt > STREAM_RETRY_MS) {
        openStream();
      }
    }, 5000);

    return () => {
      disposed = true;
      clearInterval(watchdog);
      stopPolling();
      closeStream();
    };
  }, [apply]);

  return { trips, status, loaded, clockOffset };
}
