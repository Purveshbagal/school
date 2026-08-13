import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { formatDateInput } from "@/lib/utils";
import { StudentForm } from "../../student-form";

export default async function EditStudentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const student = await prisma.student.findUnique({ where: { id } });
  if (!student) notFound();

  const standards = await prisma.standard.findMany({ orderBy: { order: "asc" } });
  const feeStructures = await prisma.feeStructure.findMany({
    select: { standardId: true, academicYear: true, totalAmount: true },
  });
  const districts = await prisma.district.findMany({
    orderBy: { name: "asc" },
    include: { talukas: { orderBy: { name: "asc" }, include: { villages: { orderBy: { name: "asc" } } } } },
  });

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title={`Edit Student — ${student.name}`} />
      <StudentForm
        standards={standards}
        feeStructures={feeStructures}
        districts={districts}
        defaultAcademicYear={student.academicYear}
        today={formatDateInput(new Date())}
        student={student}
      />
    </div>
  );
}
