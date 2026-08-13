import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { FeeStructureForm } from "./fee-structure-form";

export default async function EditFeeStructurePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const standard = await prisma.standard.findUnique({ where: { id } });
  if (!standard) notFound();

  const settings = await prisma.schoolSettings.findUnique({ where: { id: "main" } });
  const academicYear = settings?.academicYear || "2026-27";

  const feeStructure = await prisma.feeStructure.findUnique({
    where: { standardId_academicYear: { standardId: id, academicYear } },
    include: { components: true },
  });

  return (
    <div className="mx-auto max-w-xl">
      <PageHeader
        title={`Fee Structure — Standard ${standard.name}`}
        description={`Academic year ${academicYear}`}
      />
      <FeeStructureForm
        standardId={id}
        academicYear={academicYear}
        initialComponents={
          feeStructure?.components.map((c) => ({ name: c.name, amount: c.amount })) || [
            { name: "Tuition Fee", amount: 0 },
          ]
        }
      />
    </div>
  );
}
