import Link from "next/link";
import { statSync } from "node:fs";
import path from "node:path";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DeleteButton } from "@/components/delete-button";
import { deleteDriverAction } from "@/app/actions/bus-drivers";
import { formatDate } from "@/lib/utils";
import { Bus, MapPin, Pencil, Phone, UserPlus, UserRound } from "lucide-react";
import { LiveTrackingTabs } from "../live-tracking-tabs";
import { AppSetupCard } from "./app-setup-card";

const APK_PUBLIC_PATH = "/downloads/bus-driver.apk";

function apkInfo(): { url: string; updatedOn: string } | null {
  try {
    const stat = statSync(path.join(process.cwd(), "public", APK_PUBLIC_PATH));
    // ?v= busts browser caches when a new build is dropped in.
    return { url: `${APK_PUBLIC_PATH}?v=${stat.mtimeMs.toFixed(0)}`, updatedOn: formatDate(stat.mtime) };
  } catch {
    return null;
  }
}

export default async function DriversPage() {
  const [drivers, activeTrips, villages] = await Promise.all([
    prisma.busDriver.findMany({ include: { bus: true }, orderBy: { createdAt: "desc" } }),
    prisma.busTrip.findMany({ where: { status: "ACTIVE" }, select: { id: true, driverId: true } }),
    prisma.village.findMany({ select: { id: true, name: true } }),
  ]);
  const tripByDriver = new Map(activeTrips.map((t) => [t.driverId, t.id]));
  const villageName = new Map(villages.map((v) => [v.id, v.name]));
  const apk = apkInfo();

  return (
    <div>
      <PageHeader
        title="Live Tracking"
        description={`${drivers.length} driver${drivers.length === 1 ? "" : "s"} assigned`}
        actions={
          <Button render={<Link href="/live-tracking/drivers/new" />}>
            <UserPlus /> Assign Driver
          </Button>
        }
      />
      <LiveTrackingTabs />

      <div className="mx-auto max-w-3xl">
        <AppSetupCard apkUrl={apk?.url ?? null} apkUpdatedOn={apk?.updatedOn ?? null} />

        <Card>
          <CardContent>
            {drivers.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-10 text-center text-sm text-muted-foreground">
                <UserRound className="h-8 w-8 text-muted-foreground/40" />
                <p>No drivers yet. Click &quot;Assign Driver&quot; to create a driver login.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {drivers.map((d) => {
                  const tripId = tripByDriver.get(d.id);
                  return (
                    <div key={d.id} className="rounded-lg border border-border p-3.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="flex flex-wrap items-center gap-2 font-medium">
                            {d.name}
                            {d.status !== "ACTIVE" && <Badge variant="outline">Inactive</Badge>}
                            {tripId && (
                              <Link href={`/live-tracking?trip=${tripId}`}>
                                <Badge variant="success">● Driving now</Badge>
                              </Link>
                            )}
                          </p>
                          <p className="font-mono text-xs text-muted-foreground">@{d.username}</p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            render={
                              <Link href={`/live-tracking/drivers/${d.id}/edit`} aria-label={`Edit ${d.name}`}>
                                <Pencil />
                              </Link>
                            }
                          />
                          <DeleteButton
                            action={deleteDriverAction}
                            hiddenFields={{ id: d.id }}
                            confirmMessage={`Delete driver ${d.name} (@${d.username})? Their app will be logged out. Past trips stay in Trip History.`}
                          />
                        </div>
                      </div>
                      <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Bus className="h-3.5 w-3.5 text-orange-500" />
                          {d.bus ? (
                            <span className="font-medium text-foreground">{d.bus.vehicleNumber}</span>
                          ) : (
                            <span className="text-destructive">No bus assigned</span>
                          )}
                        </span>
                        {d.phone && (
                          <a href={`tel:${d.phone}`} className="flex items-center gap-1 hover:text-foreground">
                            <Phone className="h-3.5 w-3.5" /> {d.phone}
                          </a>
                        )}
                        <span>Added {formatDate(d.createdAt)}</span>
                      </div>
                      {(() => {
                        const names = d.villageIds.map((id) => villageName.get(id)).filter((n): n is string => Boolean(n));
                        return (
                          <p className="mt-1.5 flex items-start gap-1 text-xs text-muted-foreground">
                            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-orange-500" />
                            {names.length ? (
                              <span>{names.sort((a, b) => a.localeCompare(b)).join(", ")}</span>
                            ) : (
                              <span>No villages selected — students won&apos;t see this bus in the student app</span>
                            )}
                          </p>
                        );
                      })()}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
