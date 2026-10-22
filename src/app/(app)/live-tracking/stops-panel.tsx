"use client";

import { MapPin, Timer } from "lucide-react";
import { NativeSelect } from "@/components/ui/native-select";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatClock, formatDuration, type Stop } from "@/lib/tracking";
import { PlaceName } from "./place-name";

export const MIN_STOP_OPTIONS = [
  { value: 30_000, label: "30 sec+" },
  { value: 60_000, label: "1 min+" },
  { value: 120_000, label: "2 min+" },
  { value: 300_000, label: "5 min+" },
] as const;

export const DEFAULT_MIN_STOP_MS = 60_000;

export function StopsPanel({
  stops,
  minStopMs,
  onMinStopChange,
  onFocus,
}: {
  stops: Stop[];
  minStopMs: number;
  onMinStopChange: (ms: number) => void;
  onFocus?: (stop: Stop) => void;
}) {
  const totalStopped = stops.reduce((sum, s) => sum + s.durationMs, 0);

  return (
    <div>
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold">Stops ({stops.length})</p>
          {stops.length > 0 && (
            <p className="text-xs text-muted-foreground">Total stopped: {formatDuration(totalStopped)}</p>
          )}
        </div>
        <NativeSelect
          value={minStopMs}
          onChange={(e) => onMinStopChange(Number(e.target.value))}
          className="h-7 w-28 text-xs"
          aria-label="Minimum stop length"
        >
          {MIN_STOP_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </NativeSelect>
      </div>

      {stops.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border px-3 py-4 text-center text-xs text-muted-foreground">
          No stops longer than {formatDuration(minStopMs)} yet.
        </p>
      ) : (
        <ol className="space-y-1.5">
          {stops.map((s, i) => (
            <li key={`${s.startT}`}>
              <button
                type="button"
                onClick={() => onFocus?.(s)}
                className={cn(
                  "flex w-full items-start gap-2.5 rounded-lg border border-border p-2.5 text-left transition-colors hover:border-primary/40 hover:bg-muted/60",
                  s.ongoing && "border-warning/50 bg-warning/5"
                )}
              >
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-orange-600 text-[10px] font-bold text-white">
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-start gap-1 text-sm font-medium">
                    <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <PlaceName lat={s.lat} lng={s.lng} className="line-clamp-2" />
                  </span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    {formatClock(s.startT)} – {s.ongoing ? "now" : formatClock(s.endT)}
                  </span>
                </span>
                <span className="flex shrink-0 flex-col items-end gap-1">
                  <span className="flex items-center gap-1 text-sm font-semibold text-orange-700 dark:text-orange-400">
                    <Timer className="h-3.5 w-3.5" />
                    {formatDuration(s.durationMs)}
                  </span>
                  {s.ongoing && <Badge variant="warning">Standing now</Badge>}
                </span>
              </button>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
