import "server-only";
import { prisma } from "@/lib/db";
import type { Bus, BusDriver } from "@/generated/prisma/client";

/** What the driver app shows on its home screen: who's logged in, their bus, and any trip in progress. */
export async function driverProfile(driver: BusDriver & { bus: Bus | null }) {
  const activeTrip = await prisma.busTrip.findFirst({
    where: { driverId: driver.id, status: "ACTIVE" },
    orderBy: { startedAt: "desc" },
  });

  return {
    driver: { id: driver.id, name: driver.name, username: driver.username, phone: driver.phone },
    bus: driver.bus ? { id: driver.bus.id, vehicleNumber: driver.bus.vehicleNumber } : null,
    activeTrip: activeTrip
      ? {
          id: activeTrip.id,
          vehicleNumber: activeTrip.vehicleNumber,
          startedAt: activeTrip.startedAt.getTime(),
          lastPointAt: activeTrip.lastPointAt?.getTime() ?? null,
        }
      : null,
  };
}
