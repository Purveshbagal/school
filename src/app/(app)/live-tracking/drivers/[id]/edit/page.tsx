import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { isObjectId } from "@/lib/driver-auth";
import { DriverForm } from "../../driver-form";
import { getBusOptions, getVillageOptions } from "../../bus-options";

export default async function EditDriverPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isObjectId(id)) notFound();

  const [driver, buses, villages] = await Promise.all([
    prisma.busDriver.findUnique({ where: { id } }),
    getBusOptions(),
    getVillageOptions(id),
  ]);
  if (!driver) notFound();

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title={`Edit Driver — ${driver.name}`} />
      <DriverForm
        buses={buses}
        villages={villages}
        driver={{
          id: driver.id,
          name: driver.name,
          phone: driver.phone,
          username: driver.username,
          busId: driver.busId,
          villageIds: driver.villageIds,
          status: driver.status,
        }}
      />
    </div>
  );
}
