import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { formatDateInput } from "@/lib/utils";
import { StudentForm } from "../student-form";

export default async function NewStudentPage() {
  const standards = await prisma.standard.findMany({ orderBy: { order: "asc" } });
  const settings = await prisma.schoolSettings.findUnique({ where: { id: "main" } });
  const feeStructures = await prisma.feeStructure.findMany({
    select: { standardId: true, academicYear: true, totalAmount: true },
  });
  const districts = await prisma.district.findMany({
    orderBy: { name: "asc" },
    include: { talukas: { orderBy: { name: "asc" }, include: { villages: { orderBy: { name: "asc" } } } } },
  });

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="New Admission" description="Enroll a new student" />
      <StudentForm
        standards={standards}
        feeStructures={feeStructures}
        districts={districts}
        defaultAcademicYear={settings?.academicYear || "2026-27"}
        today={formatDateInput(new Date())}
      />
    </div>
  );
}
