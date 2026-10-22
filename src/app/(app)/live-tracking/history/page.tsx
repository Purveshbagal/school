import Link from "next/link";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { isObjectId } from "@/lib/driver-auth";
import { dayBounds, dayKey, formatClock, formatDistance, formatDuration } from "@/lib/tracking";
import { Route } from "lucide-react";
import { LiveTrackingTabs } from "../live-tracking-tabs";
import { HistoryFilters } from "./history-filters";

export default async function TripHistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; bus?: string }>;
}) {
  const { date: dateParam, bus: busParam } = await searchParams;
  const today = dayKey(new Date());
  const bounds = (dateParam && dayBounds(dateParam)) || dayBounds(today)!;
  const date = dateParam && dayBounds(dateParam) ? dateParam : today;
  const busId = isObjectId(busParam) ? busParam : "";

  const [trips, buses] = await Promise.all([
    prisma.busTrip.findMany({
      where: {
        startedAt: { gte: bounds.start, lt: bounds.end },
        ...(busId ? { busId } : {}),
      },
      orderBy: { startedAt: "desc" },
    }),
    prisma.bus.findMany({ orderBy: { vehicleNumber: "asc" }, select: { id: true, vehicleNumber: true } }),
  ]);

  const totalDistance = trips.reduce((sum, t) => sum + (t.distanceMeters ?? 0), 0);
  // A live trip's duration runs up to its latest fix.
  const endOf = (t: (typeof trips)[number]) => (t.endedAt ?? t.lastPointAt ?? t.startedAt).getTime();

  return (
    <div>
      <PageHeader title="Live Tracking" description="Every trip's route, stops and timing" />
      <LiveTrackingTabs />

      <Card>
        <CardContent>
          <HistoryFilters date={date} today={today} busId={busId} buses={buses} />

          {trips.length > 0 && (
            <p className="mb-3 text-xs text-muted-foreground">
              {trips.length} trip{trips.length === 1 ? "" : "s"} · {formatDistance(totalDistance)} driven
            </p>
          )}

          {trips.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center text-sm text-muted-foreground">
              <Route className="h-8 w-8 text-muted-foreground/40" />
              <p>No trips on this day.</p>
            </div>
          ) : (
            <>
              {/* Mobile card list */}
              <div className="space-y-2.5 md:hidden">
                {trips.map((t) => {
                  const live = t.status === "ACTIVE";
                  const end = endOf(t);
                  return (
                    <Link
                      key={t.id}
                      href={`/live-tracking/trips/${t.id}`}
                      className="block rounded-lg border border-border p-3 hover:bg-muted/60"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-medium">{t.vehicleNumber}</p>
                          <p className="text-xs text-muted-foreground">{t.driverName}</p>
                        </div>
                        {live ? <Badge variant="success">● Live</Badge> : <Badge variant="outline">Completed</Badge>}
                      </div>
                      <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                        <span>
                          {formatClock(t.startedAt)} – {live ? "now" : formatClock(t.endedAt)}
                        </span>
                        <span>
                          {formatDuration(end - t.startedAt.getTime())}
                          {t.distanceMeters != null && ` · ${formatDistance(t.distanceMeters)}`}
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>

              {/* Desktop table */}
              <Table className="hidden md:table">
                <TableHeader>
                  <TableRow>
                    <TableHead>Bus</TableHead>
                    <TableHead>Driver</TableHead>
                    <TableHead>Start</TableHead>
                    <TableHead>End</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Distance</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Route</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {trips.map((t) => {
                    const live = t.status === "ACTIVE";
                    const end = endOf(t);
                    return (
                      <TableRow key={t.id}>
                        <TableCell className="font-medium">{t.vehicleNumber}</TableCell>
                        <TableCell>{t.driverName}</TableCell>
                        <TableCell>{formatClock(t.startedAt)}</TableCell>
                        <TableCell>{live ? "-" : formatClock(t.endedAt)}</TableCell>
                        <TableCell>{formatDuration(end - t.startedAt.getTime())}</TableCell>
                        <TableCell>{t.distanceMeters != null ? formatDistance(t.distanceMeters) : "-"}</TableCell>
                        <TableCell>
                          {live ? <Badge variant="success">● Live</Badge> : <Badge variant="outline">Completed</Badge>}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="outline" size="sm" render={<Link href={`/live-tracking/trips/${t.id}`}>View</Link>} />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
