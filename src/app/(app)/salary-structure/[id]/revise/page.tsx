import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { getActiveSalaryStructure } from "@/lib/payroll-data";
import { formatDateInput } from "@/lib/utils";
import { ReviseSalaryForm } from "./revise-salary-form";

export default async function ReviseSalaryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const teacher = await prisma.teacher.findUnique({ where: { id } });
  if (!teacher) notFound();

  const activeStructure = await getActiveSalaryStructure(id);

  return (
    <div className="mx-auto max-w-xl">
      <PageHeader
        title={`Revise Salary — ${teacher.name}`}
        description="Old months keep their original salary; the new amount applies from the effective date onward."
      />
      <ReviseSalaryForm
        teacherId={id}
        currentSalary={activeStructure?.monthlySalary || 0}
        currentCalculationType={activeStructure?.calculationType || "MONTHLY"}
        today={formatDateInput(new Date())}
      />
    </div>
  );
}
