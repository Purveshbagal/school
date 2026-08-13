import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { BusForm } from "../../bus-form";

export default async function EditBusPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const bus = await prisma.bus.findUnique({ where: { id } });
  if (!bus) notFound();

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title={`Edit Bus — ${bus.vehicleNumber}`} />
      <BusForm bus={bus} />
    </div>
  );
}
