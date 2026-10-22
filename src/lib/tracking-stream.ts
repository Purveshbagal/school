import "server-only";
import { onTrackingChanged } from "@/lib/tracking-events";
import type { TrackingFeed, WirePoint } from "@/lib/tracking";

/** Coalesces a burst of driver uploads into one read. */
const WAKE_DELAY_MS = 60;
const HEARTBEAT_MS = 15_000;
/** Streams are recycled now and then; clients reconnect on their own. */
const MAX_STREAM_MS = 30 * 60 * 1000;
const SENT_POINT_MEMORY_MS = 60_000;
const NON_META_KEYS = new Set(["type", "cursor", "serverTime", "points"]);

type StreamOptions<F extends TrackingFeed> = {
  /** Reads the feed: a snapshot when `cursor` is null, else what changed since it. */
  readFeed: (cursor: number | null) => Promise<F>;
  /** Whether a change signal from this driver (undefined = anyone) concerns this stream. */
  wakesFor?: (driverId?: string) => boolean;
  /** Re-read even without a signal — covers uploads handled by another server process. */
  fallbackSyncMs?: number;
};

/**
 * Server-Sent Events response for a tracking feed. Sends a "snapshot" first, then a "delta"
 * whenever a driver's phone reports in — pushed within ~100 ms of the upload. Points the
 * connection already delivered are filtered out, and a delta is skipped when nothing
 * (neither points nor the rest of the feed) changed.
 */
export function trackingFeedStream<F extends TrackingFeed>(
  request: Request,
  { readFeed, wakesFor = () => true, fallbackSyncMs = 3000 }: StreamOptions<F>
): Response {
  const encoder = new TextEncoder();
  let cleanup = () => {};

  // Everything but the points and cursors — a change here is worth a delta on its own.
  const metaJson = (feed: F) => JSON.stringify(Object.entries(feed).filter(([key]) => !NON_META_KEYS.has(key)));

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false;
      let cursor: number | null = null;
      let syncing = false;
      let resync = false;
      let wakeTimer: ReturnType<typeof setTimeout> | null = null;
      let lastMetaJson = "";
      // Points this connection already delivered (the feed re-reads a short overlap window).
      const sentPoints = new Map<string, number>();

      const write = (chunk: string) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          cleanup();
        }
      };
      const send = (event: string, data: unknown) => write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);

      const deliver = (feed: F) => {
        const meta = metaJson(feed);

        if (feed.type === "snapshot") {
          sentPoints.clear();
          for (const [tripId, pts] of Object.entries(feed.points)) {
            for (const p of pts) sentPoints.set(`${tripId}:${p[2]}`, feed.cursor);
          }
          lastMetaJson = meta;
          send("snapshot", feed);
          return;
        }

        const fresh: Record<string, WirePoint[]> = {};
        let freshCount = 0;
        for (const [tripId, pts] of Object.entries(feed.points)) {
          for (const p of pts) {
            const key = `${tripId}:${p[2]}`;
            if (sentPoints.has(key)) continue;
            sentPoints.set(key, feed.cursor);
            (fresh[tripId] ??= []).push(p);
            freshCount++;
          }
        }
        for (const [key, sentAt] of sentPoints) {
          if (sentAt < feed.cursor - SENT_POINT_MEMORY_MS) sentPoints.delete(key);
        }

        if (freshCount === 0 && meta === lastMetaJson) return;
        lastMetaJson = meta;
        send("delta", { ...feed, points: fresh });
      };

      const sync = async () => {
        if (closed) return;
        if (syncing) {
          resync = true;
          return;
        }
        syncing = true;
        try {
          do {
            resync = false;
            const feed = await readFeed(cursor);
            if (closed) break;
            cursor = feed.cursor;
            deliver(feed);
          } while (resync && !closed);
        } catch (error) {
          console.error("[tracking stream] feed read failed", error);
          send("feed-error", { message: "Could not read live data. Retrying…" });
        } finally {
          syncing = false;
        }
      };

      const wake = (driverId?: string) => {
        if (closed || wakeTimer || !wakesFor(driverId)) return;
        wakeTimer = setTimeout(() => {
          wakeTimer = null;
          void sync();
        }, WAKE_DELAY_MS);
      };

      const unsubscribe = onTrackingChanged(wake);
      const fallbackTimer = setInterval(() => void sync(), fallbackSyncMs);
      const heartbeatTimer = setInterval(() => send("ping", { t: Date.now() }), HEARTBEAT_MS);
      const lifetimeTimer = setTimeout(() => cleanup(), MAX_STREAM_MS);

      cleanup = () => {
        if (closed) return;
        closed = true;
        unsubscribe();
        clearInterval(fallbackTimer);
        clearInterval(heartbeatTimer);
        clearTimeout(lifetimeTimer);
        if (wakeTimer) clearTimeout(wakeTimer);
        try {
          controller.close();
        } catch {
          // already closed by the client
        }
      };
      request.signal.addEventListener("abort", () => cleanup());

      // Padding defeats proxies that hold back the first couple of KB; `retry` sets the
      // browser's reconnect delay.
      write(`: ${" ".repeat(2048)}\nretry: 2000\n\n`);
      void sync();
    },
    cancel() {
      cleanup();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      // no-transform keeps Next's gzip (and most proxies) from buffering the stream.
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
