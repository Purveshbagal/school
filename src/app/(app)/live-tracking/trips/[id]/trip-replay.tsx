"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Gauge, Pause, Play, Route, Timer, TimerOff } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  detectStops,
  formatClock,
  formatDistance,
  formatDuration,
  formatSpeedKmh,
  fromWirePoint,
  isUsable,
  pathDistanceMeters,
  type TripSummary,
  type WirePoint,
} from "@/lib/tracking";
import { TrackingMap, type MapFocus } from "../../tracking-map";
import { DEFAULT_MIN_STOP_MS, StopsPanel } from "../../stops-panel";
import { PlaceName } from "../../place-name";

const PLAY_STEP_MS = 60;

export function TripReplay({ trip, wirePoints }: { trip: TripSummary; wirePoints: WirePoint[] }) {
  const points = useMemo(() => wirePoints.map(fromWirePoint), [wirePoints]);
  const usable = useMemo(() => points.filter(isUsable), [points]);
  const [minStopMs, setMinStopMs] = useState(DEFAULT_MIN_STOP_MS);
  const [focus, setFocus] = useState<MapFocus | null>(null);
  const [cursorIndex, setCursorIndex] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(
    () => () => {
      if (timerRef.current) clearInterval(timerRef.current);
    },
    []
  );

  const live = trip.status === "ACTIVE";
  const stops = useMemo(() => detectStops(points, { minDurationMs: minStopMs, live }), [points, minStopMs, live]);
  const distance = useMemo(() => trip.distanceMeters ?? pathDistanceMeters(points), [trip.distanceMeters, points]);
  const maxSpeed = useMemo(() => points.reduce((m, p) => Math.max(m, p.speed ?? 0), 0), [points]);

  const first = usable[0] ?? points[0];
  const last = usable[usable.length - 1] ?? points[points.length - 1];
  const endT = trip.endedAt ?? last?.t ?? trip.startedAt;
  const durationMs = endT - trip.startedAt;
  const stoppedMs = stops.reduce((sum, s) => sum + s.durationMs, 0);
  const movingMs = Math.max(0, durationMs - stoppedMs);
  const avgSpeed = movingMs > 60_000 ? distance / (movingMs / 1000) : null;
  // Phones that don't report speed (or report it sparsely) would otherwise show avg > max.
  const topSpeed = Math.max(maxSpeed, avgSpeed ?? 0);

  const mapTrips = useMemo(
    () => [{ id: trip.id, label: trip.vehicleNumber, points, stops, live: false }],
    [trip.id, trip.vehicleNumber, points, stops]
  );

  const cursorPoint = cursorIndex != null ? usable[cursorIndex] : null;
  const cursor = cursorPoint
    ? { lat: cursorPoint.lat, lng: cursorPoint.lng, heading: cursorPoint.heading, label: formatClock(cursorPoint.t, true) }
    : null;

  function stopPlaying() {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    setPlaying(false);
  }

  function togglePlay() {
    if (playing) return stopPlaying();
    if (usable.length < 2) return;
    let i = cursorIndex == null || cursorIndex >= usable.length - 1 ? 0 : cursorIndex;
    setCursorIndex(i);
    // Whole trip plays in ~30 s regardless of its length.
    const step = Math.max(1, Math.round(usable.length / (30_000 / PLAY_STEP_MS)));
    timerRef.current = setInterval(() => {
      i = Math.min(usable.length - 1, i + step);
      setCursorIndex(i);
      if (i >= usable.length - 1) stopPlaying();
    }, PLAY_STEP_MS);
    setPlaying(true);
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(320px,380px)_1fr]">
      <div className="lg:order-2">
        <Card className="gap-0 p-0 py-0 lg:sticky lg:top-6">
          <div className="h-[55vh] min-h-[360px] lg:h-[calc(100vh-14rem)]">
            {points.length ? (
              <TrackingMap trips={mapTrips} selectedId={trip.id} focus={focus} cursor={cursor} />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                No GPS points were recorded for this trip.
              </div>
            )}
          </div>
          {usable.length > 1 && (
            <div className="flex items-center gap-3 border-t border-border px-3 py-2.5">
              <Button size="icon-sm" variant="outline" onClick={togglePlay} aria-label={playing ? "Pause" : "Play route"}>
                {playing ? <Pause /> : <Play />}
              </Button>
              <input
                type="range"
                min={0}
                max={usable.length - 1}
                value={cursorIndex ?? 0}
                onChange={(e) => {
                  stopPlaying();
                  setCursorIndex(Number(e.target.value));
                }}
                className="h-1.5 flex-1 cursor-pointer accent-green-600"
                aria-label="Replay position"
              />
              <span className="w-24 shrink-0 text-right font-mono text-xs text-muted-foreground">
                {cursorPoint ? formatClock(cursorPoint.t, true) : "Replay"}
              </span>
            </div>
          )}
        </Card>
      </div>

      <div className="space-y-4 lg:order-1">
        <Card size="sm">
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <Stat icon={Timer} label="Duration" value={formatDuration(durationMs)} />
              <Stat icon={Route} label="Distance" value={formatDistance(distance)} />
              <Stat icon={Gauge} label="Avg / Max speed" value={`${formatSpeedKmh(avgSpeed)} / ${topSpeed > 0 ? formatSpeedKmh(topSpeed) : "-"}`} />
              <Stat icon={TimerOff} label="Stopped" value={stops.length ? formatDuration(stoppedMs) : "-"} />
            </div>

            <div className="space-y-3 rounded-lg bg-muted/50 p-3 text-sm">
              <div className="flex gap-2">
                <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-green-700" />
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Started from · {formatClock(trip.startedAt)}</p>
                  {first ? <PlaceName lat={first.lat} lng={first.lng} className="font-medium" /> : <p>-</p>}
                </div>
              </div>
              <div className="flex gap-2">
                <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-red-700" />
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">
                    {live ? "Latest position" : "Ended at"} · {formatClock(live ? last?.t : endT)}
                  </p>
                  {last ? <PlaceName lat={last.lat} lng={last.lng} className="font-medium" /> : <p>-</p>}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card size="sm">
          <CardContent>
            <StopsPanel
              stops={stops}
              minStopMs={minStopMs}
              onMinStopChange={setMinStopMs}
              onFocus={(s) => setFocus({ lat: s.lat, lng: s.lng, key: Date.now() })}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: typeof Timer; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border p-2.5">
      <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
        <Icon className="h-3 w-3" /> {label}
      </p>
      <p className="mt-0.5 text-sm font-semibold">{value}</p>
    </div>
  );
}
