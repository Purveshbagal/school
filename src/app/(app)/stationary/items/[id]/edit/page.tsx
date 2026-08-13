import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { ItemForm } from "../../item-form";

export default async function EditStationaryItemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const item = await prisma.stationaryItem.findUnique({ where: { id } });
  if (!item) notFound();

  return (
    <div className="mx-auto max-w-lg">
      <PageHeader title={`Edit Item — ${item.name}`} />
      <ItemForm item={item} />
    </div>
  );
}
