"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Bus,
  Crosshair,
  ExternalLink,
  Gauge,
  LocateFixed,
  Maximize2,
  Navigation,
  Route,
  Timer,
  UserRound,
  WifiOff,
  X,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  detectStops,
  formatAgo,
  formatClock,
  formatDistance,
  formatDuration,
  formatSpeedKmh,
  latestPoint,
  liveStateOf,
  pathDistanceMeters,
  type LiveState,
  type Stop,
} from "@/lib/tracking";
import { TrackingMap, type MapFocus, type MapTrip } from "./tracking-map";
import { useTrackingFeed, type FeedStatus, type LiveTrip } from "./use-tracking-feed";
import { useNow } from "./use-now";
import { DEFAULT_MIN_STOP_MS, StopsPanel } from "./stops-panel";
import { PlaceName } from "./place-name";

export type IdleDriver = { id: string; name: string; vehicleNumber: string | null };

/** Shortest standstill that already counts for the "Stopped · 2 min" label on a bus. */
const STILL_LABEL_MS = 15_000;

type TripView = {
  trip: LiveTrip;
  stops: Stop[];
  still: Stop | null;
  state: LiveState;
};

export function LiveTrackingView({
  drivers,
  initialTripId,
}: {
  drivers: IdleDriver[];
  initialTripId: string | null;
}) {
  const { trips, status, loaded, clockOffset } = useTrackingFeed();
  const localNow = useNow(1000);
  const now = localNow ? localNow + clockOffset : 0;

  const [selectedId, setSelectedId] = useState<string | null>(initialTripId);
  const [follow, setFollow] = useState(false);
  const [fitKey, setFitKey] = useState<number | undefined>(initialTripId ? 0 : undefined);
  const [focus, setFocus] = useState<MapFocus | null>(null);
  const [minStopMs, setMinStopMs] = useState(DEFAULT_MIN_STOP_MS);

  const tripList = useMemo(
    () =>
      [...trips.values()].sort((a, b) =>
        a.summary.vehicleNumber.localeCompare(b.summary.vehicleNumber, "en", { numeric: true })
      ),
    [trips]
  );

  const analysed = useMemo(
    () =>
      tripList.map((trip) => {
        const stops = detectStops(trip.points, { minDurationMs: minStopMs, live: true });
        const tail = detectStops(trip.points, { minDurationMs: STILL_LABEL_MS, live: true }).at(-1);
        return { trip, stops, still: tail?.ongoing ? tail : null };
      }),
    [tripList, minStopMs]
  );

  const views: TripView[] = analysed.map((a) => ({
    ...a,
    state: liveStateOf(a.trip.points, now, a.still ? [a.still] : []),
  }));

  const mapTrips: MapTrip[] = useMemo(
    () =>
      analysed.map(({ trip, stops }) => ({
        id: trip.summary.id,
        label: trip.summary.vehicleNumber,
        points: trip.points,
        stops,
        live: true,
      })),
    [analysed]
  );

  const states: Record<string, LiveState> = Object.fromEntries(views.map((v) => [v.trip.summary.id, v.state]));

  const selected = views.find((v) => v.trip.summary.id === selectedId) ?? null;
  const selectionEnded = loaded && selectedId != null && !selected;
  const activeDriverIds = new Set(tripList.map((t) => t.summary.driverId));
  const idleDrivers = drivers.filter((d) => !activeDriverIds.has(d.id));

  function select(id: string) {
    setSelectedId(id);
    setFitKey((k) => (k ?? 0) + 1);
  }

  function clearSelection() {
    setSelectedId(null);
    setFollow(false);
    setFitKey((k) => (k ?? 0) + 1);
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(320px,380px)_1fr]">
      {/* Map */}
      <div className="lg:order-2">
        <Card className="relative gap-0 p-0 py-0 lg:sticky lg:top-6">
          <div className="h-[58vh] min-h-[380px] lg:h-[calc(100vh-11rem)]">
            <TrackingMap
              trips={mapTrips}
              states={states}
              selectedId={selectedId}
              onSelect={select}
              follow={follow}
              onUserPan={() => setFollow(false)}
              fitKey={fitKey}
              focus={focus}
            />
          </div>
          <div className="pointer-events-none absolute top-3 left-14 z-[500] flex flex-wrap gap-2">
            <StatusPill status={status} />
          </div>
          <div className="absolute right-3 bottom-8 z-[500] flex flex-col gap-2">
            {selected && (
              <Button
                size="sm"
                variant={follow ? "default" : "outline"}
                onClick={() => setFollow((f) => !f)}
                className="shadow-md"
              >
                <LocateFixed /> {follow ? "Following" : "Follow bus"}
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={() => setFitKey((k) => (k ?? 0) + 1)} className="shadow-md">
              <Maximize2 /> Fit
            </Button>
          </div>
          {loaded && tripList.length === 0 && (
            <div className="pointer-events-none absolute inset-x-0 top-1/2 z-[500] mx-auto w-fit -translate-y-1/2 rounded-xl bg-background/95 px-5 py-4 text-center shadow-lg ring-1 ring-border">
              <Bus className="mx-auto mb-1.5 h-7 w-7 text-muted-foreground/60" />
              <p className="text-sm font-medium">No bus is on a trip right now</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                A bus appears here as soon as its driver taps &quot;Drive&quot; in the app.
              </p>
            </div>
          )}
        </Card>
      </div>

      {/* Side panel */}
      <div className="space-y-4 lg:order-1">
        {selectionEnded && (
          <div className="flex items-start justify-between gap-2 rounded-xl border border-border bg-card p-3.5 text-sm">
            <div>
              <p className="font-medium">This trip has ended</p>
              <Link
                href={`/live-tracking/trips/${selectedId}`}
                className="text-xs text-primary hover:underline"
              >
                View the full trip route and stops
              </Link>
            </div>
            <Button variant="ghost" size="icon-sm" onClick={clearSelection} aria-label="Close">
              <X />
            </Button>
          </div>
        )}

        {selected ? (
          <SelectedTripCard
            view={selected}
            now={now}
            minStopMs={minStopMs}
            onMinStopChange={setMinStopMs}
            onClose={clearSelection}
            onFocusStop={(s) => setFocus({ lat: s.lat, lng: s.lng, key: Date.now() })}
          />
        ) : null}

        <Card size="sm">
          <CardContent>
            <p className="mb-2.5 text-sm font-semibold">
              On trip now {loaded && <span className="text-muted-foreground">({tripList.length})</span>}
            </p>
            {!loaded ? (
              <div className="space-y-2">
                {[0, 1].map((i) => (
                  <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />
                ))}
              </div>
            ) : views.length === 0 ? (
              <p className="py-4 text-center text-xs text-muted-foreground">No bus is moving right now.</p>
            ) : (
              <div className="space-y-2">
                {views.map((v) => (
                  <TripRow
                    key={v.trip.summary.id}
                    view={v}
                    now={now}
                    selected={v.trip.summary.id === selectedId}
                    onClick={() => select(v.trip.summary.id)}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card size="sm">
          <CardContent>
            <div className="mb-2.5 flex items-center justify-between gap-2">
              <p className="text-sm font-semibold">Not driving ({idleDrivers.length})</p>
              <Link href="/live-tracking/drivers" className="text-xs text-primary hover:underline">
                Manage drivers
              </Link>
            </div>
            {idleDrivers.length === 0 ? (
              <p className="py-2 text-center text-xs text-muted-foreground">
                {drivers.length === 0 ? "No drivers assigned yet." : "Every driver is on a trip."}
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {idleDrivers.map((d) => (
                  <li key={d.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                    <span className="flex min-w-0 items-center gap-2">
                      <UserRound className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="truncate">{d.name}</span>
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">{d.vehicleNumber || "No bus"}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: FeedStatus }) {
  const config: Record<FeedStatus, { label: string; dot: string }> = {
    live: { label: "Live", dot: "bg-green-500 animate-pulse" },
    polling: { label: "Live · 2 sec refresh", dot: "bg-green-500" },
    connecting: { label: "Connecting…", dot: "bg-blue-500 animate-pulse" },
    reconnecting: { label: "Reconnecting…", dot: "bg-amber-500 animate-pulse" },
    unauthorized: { label: "Session expired — log in again", dot: "bg-red-500" },
  };
  const { label, dot } = config[status];
  return (
    <span className="flex items-center gap-1.5 rounded-full bg-background/95 px-2.5 py-1 text-xs font-medium shadow-md ring-1 ring-border">
      <span className={cn("h-2 w-2 rounded-full", dot)} />
      {label}
    </span>
  );
}

function stateBadge(view: TripView, now: number) {
  const last = view.trip.points[view.trip.points.length - 1];
  switch (view.state) {
    case "moving":
      return <Badge variant="success">Moving · {formatSpeedKmh(last?.speed)}</Badge>;
    case "stopped":
      return (
        <Badge variant="warning">
          Stopped{view.still ? ` · ${formatDuration(Math.max(view.still.durationMs, now - view.still.startT))}` : ""}
        </Badge>
      );
    case "no-signal":
      return (
        <Badge variant="outline" className="text-muted-foreground">
          <WifiOff /> No signal
        </Badge>
      );
    default:
      return <Badge variant="info">Waiting for GPS…</Badge>;
  }
}

function TripRow({
  view,
  now,
  selected,
  onClick,
}: {
  view: TripView;
  now: number;
  selected: boolean;
  onClick: () => void;
}) {
  const { summary, points } = view.trip;
  const last = points[points.length - 1];

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full rounded-lg border p-3 text-left transition-colors",
        selected ? "border-primary bg-primary/5 ring-1 ring-primary/30" : "border-border hover:bg-muted/60"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 font-semibold">
            <Bus className="h-4 w-4 shrink-0 text-orange-500" />
            <span className="truncate">{summary.vehicleNumber}</span>
          </p>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">{summary.driverName} · {summary.direction === "TO_HOME" ? "School to home" : "Pickup to school"}</p>
        </div>
        <div className="shrink-0">{stateBadge(view, now)}</div>
      </div>
      <div className="mt-2 flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>Started {formatClock(summary.startedAt)}</span>
        <span className={cn(view.state === "no-signal" && "font-medium text-destructive")}>
          {last ? `Updated ${formatAgo(last.t, now)}` : "No location yet"}
        </span>
      </div>
    </button>
  );
}

function SelectedTripCard({
  view,
  now,
  minStopMs,
  onMinStopChange,
  onClose,
  onFocusStop,
}: {
  view: TripView;
  now: number;
  minStopMs: number;
  onMinStopChange: (ms: number) => void;
  onClose: () => void;
  onFocusStop: (stop: Stop) => void;
}) {
  const { summary, points } = view.trip;
  const distance = useMemo(() => pathDistanceMeters(points), [points]);
  const first = points[0];
  const current = latestPoint(points);
  const last = points[points.length - 1];

  return (
    <Card size="sm" className="ring-primary/30">
      <CardContent className="space-y-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-base font-semibold">
              <Bus className="h-4.5 w-4.5 shrink-0 text-orange-500" />
              <span className="truncate">{summary.vehicleNumber}</span>
            </p>
            <p className="text-xs text-muted-foreground">{summary.driverName} · {summary.direction === "TO_HOME" ? "School to home" : "Pickup to school"}</p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {stateBadge(view, now)}
            <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close">
              <X />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Stat icon={Timer} label="Running for" value={now ? formatDuration(now - summary.startedAt) : "-"} />
          <Stat icon={Route} label="Distance" value={formatDistance(distance)} />
          <Stat icon={Gauge} label="Speed" value={view.state === "moving" ? formatSpeedKmh(last?.speed) : "0 km/h"} />
          <Stat icon={Crosshair} label="Last update" value={last ? formatAgo(last.t, now) : "-"} />
        </div>

        <div className="space-y-2 rounded-lg bg-muted/50 p-3 text-sm">
          <div className="flex gap-2">
            <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-green-700" />
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Started from · {formatClock(summary.startedAt)}</p>
              {first ? <PlaceName lat={first.lat} lng={first.lng} className="font-medium" /> : <p>-</p>}
            </div>
          </div>
          <div className="flex gap-2">
            <Navigation className="mt-0.5 h-3.5 w-3.5 shrink-0 text-green-600" />
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Now at</p>
              {current ? (
                <PlaceName lat={current.lat} lng={current.lng} className="font-medium" />
              ) : (
                <p className="text-muted-foreground">Waiting for the first GPS fix…</p>
              )}
            </div>
          </div>
          {current && (
            <a
              href={`https://www.google.com/maps?q=${current.lat.toFixed(6)},${current.lng.toFixed(6)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
            >
              <ExternalLink className="h-3 w-3" /> Open current location in Google Maps
            </a>
          )}
        </div>

        <StopsPanel stops={view.stops} minStopMs={minStopMs} onMinStopChange={onMinStopChange} onFocus={onFocusStop} />

        <Button variant="outline" size="sm" className="w-full" render={<Link href={`/live-tracking/trips/${summary.id}`} />}>
          <Route /> Full trip details
        </Button>
      </CardContent>
    </Card>
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
