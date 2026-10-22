import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { formatDateInput } from "@/lib/utils";
import { feeStructureAmount } from "@/lib/rte";
import { StudentForm } from "../student-form";

export default async function NewStudentPage() {
  const standards = await prisma.standard.findMany({ orderBy: { order: "asc" } });
  const settings = await prisma.schoolSettings.findUnique({ where: { id: "main" } });
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
      <PageHeader title="New Admission" description="Enroll a new student" />
      <StudentForm
        standards={standards}
        feeStructures={feeStructures}
        districts={districts}
        busDrivers={busDrivers}
        defaultAcademicYear={settings?.academicYear || "2026-27"}
        today={formatDateInput(new Date())}
      />
    </div>
  );
}
