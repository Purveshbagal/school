import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { isObjectId } from "@/lib/driver-auth";
import { getTripPoints, toTripSummary } from "@/lib/tracking-server";
import { formatDayClock, toWirePoint } from "@/lib/tracking";
import { ArrowLeft, Radio } from "lucide-react";
import { LiveTrackingTabs } from "../../live-tracking-tabs";
import { TripReplay } from "./trip-replay";

export default async function TripDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isObjectId(id)) notFound();

  const trip = await prisma.busTrip.findUnique({ where: { id } });
  if (!trip) notFound();
  const points = await getTripPoints(trip.id);
  const live = trip.status === "ACTIVE";

  return (
    <div>
      <PageHeader
        title={`${trip.vehicleNumber} · ${trip.driverName}`}
        description={`Trip started ${formatDayClock(trip.startedAt)}`}
        actions={
          <>
            <Button variant="outline" render={<Link href="/live-tracking/history" />}>
              <ArrowLeft /> Trip History
            </Button>
            {live && (
              <Button render={<Link href={`/live-tracking?trip=${trip.id}`} />}>
                <Radio /> Watch Live
              </Button>
            )}
          </>
        }
      />
      <LiveTrackingTabs />
      <TripReplay trip={toTripSummary(trip)} wirePoints={points.map(toWirePoint)} />
    </div>
  );
}
