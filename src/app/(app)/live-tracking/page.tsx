import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { isObjectId } from "@/lib/driver-auth";
import { LiveTrackingTabs } from "./live-tracking-tabs";
import { LiveTrackingView } from "./live-tracking-view";

export default async function LiveTrackingPage({
  searchParams,
}: {
  searchParams: Promise<{ trip?: string }>;
}) {
  const { trip } = await searchParams;
  const drivers = await prisma.busDriver.findMany({
    where: { status: "ACTIVE" },
    include: { bus: { select: { vehicleNumber: true } } },
    orderBy: { name: "asc" },
  });

  return (
    <div>
      <PageHeader title="Live Tracking" description="Where every school bus is right now" />
      <LiveTrackingTabs />
      <LiveTrackingView
        drivers={drivers.map((d) => ({ id: d.id, name: d.name, vehicleNumber: d.bus?.vehicleNumber ?? null }))}
        initialTripId={isObjectId(trip) ? trip : null}
      />
    </div>
  );
}
