import "server-only";
import { prisma } from "@/lib/db";
import type { BusOption } from "./driver-form";
import type { VillageOption } from "./village-picker";

/** Every bus for the "Select Bus" dropdown, with who's already assigned to it. */
export async function getBusOptions(): Promise<BusOption[]> {
  const buses = await prisma.bus.findMany({
    orderBy: { vehicleNumber: "asc" },
    include: { drivers: { select: { name: true } } },
  });
  return buses.map((b) => ({
    id: b.id,
    vehicleNumber: b.vehicleNumber,
    status: b.status,
    assignedTo: b.drivers.map((d) => d.name),
  }));
}

/**
 * Every village (the same list as Village Bus Fees) for the route's village picker, with
 * the other drivers already covering each one. `driverId` is the driver being edited.
 */
export async function getVillageOptions(driverId?: string): Promise<VillageOption[]> {
  const [villages, drivers] = await Promise.all([
    prisma.village.findMany({ include: { taluka: { select: { name: true } } } }),
    prisma.busDriver.findMany({ select: { id: true, name: true, villageIds: true } }),
  ]);
  return villages
    .map((v) => ({
      id: v.id,
      name: v.name,
      taluka: v.taluka.name,
      coveredBy: drivers.filter((d) => d.id !== driverId && d.villageIds.includes(v.id)).map((d) => d.name),
    }))
    .sort((a, b) => a.name.localeCompare(b.name) || a.taluka.localeCompare(b.taluka));
}
