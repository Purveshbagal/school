import "server-only";
import { EventEmitter } from "node:events";

// In-process signal from the driver API to open live-map streams: "something changed,
// re-read the feed". Kept on globalThis so every route bundle (and dev hot reloads) share
// one emitter. Streams also re-read on a timer, so a multi-process deployment still works,
// just with a few seconds of extra latency.
const globalForTracking = globalThis as unknown as { trackingEvents?: EventEmitter };

const emitter = globalForTracking.trackingEvents ?? new EventEmitter();
emitter.setMaxListeners(0);
globalForTracking.trackingEvents = emitter;

/** `driverId` names the only driver whose data changed; omitted means "anything may have". */
export function notifyTrackingChanged(driverId?: string) {
  emitter.emit("change", driverId);
}

export function onTrackingChanged(listener: (driverId?: string) => void): () => void {
  emitter.on("change", listener);
  return () => {
    emitter.off("change", listener);
  };
}
