import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { formatDateInput } from "@/lib/utils";
import { feeStructureAmount } from "@/lib/rte";
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
  const feeStructures = (
    await prisma.feeStructure.findMany({
      select: {
        standardId: true,
        academicYear: true,
        totalAmount: true,
        components: { select: { name: true, amount: true } },
      },
    })
  ).map((fs) => ({
    standardId: fs.standardId,
    academicYear: fs.academicYear,
    totalAmount: fs.totalAmount,
    rteAmount: feeStructureAmount(fs, true),
  }));
  const districts = await prisma.district.findMany({
    orderBy: { name: "asc" },
    include: { talukas: { orderBy: { name: "asc" }, include: { villages: { orderBy: { name: "asc" } } } } },
  });
  const busDrivers = (await prisma.busDriver.findMany({
    where: { status: "ACTIVE", busId: { not: null } }, include: { bus: true }, orderBy: { name: "asc" },
  })).flatMap((d) => d.bus ? [{ id: d.id, name: d.name, vehicleNumber: d.bus.vehicleNumber }] : []);

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title={`Edit Student — ${student.name}`} />
      <StudentForm
        standards={standards}
        feeStructures={feeStructures}
        districts={districts}
        busDrivers={busDrivers}
        defaultAcademicYear={student.academicYear}
        today={formatDateInput(new Date())}
        student={student}
      />
    </div>
  );
}
