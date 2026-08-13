import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { AttendanceForm } from "./attendance-form";

export default async function AttendanceEntryPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ month?: string; year?: string }>;
}) {
  const { id } = await params;
  const { month: monthParam, year: yearParam } = await searchParams;
  const now = new Date();
  const month = Number(monthParam) || now.getMonth() + 1;
  const year = Number(yearParam) || now.getFullYear();

  const teacher = await prisma.teacher.findUnique({ where: { id } });
  if (!teacher) notFound();

  const [existing, payroll, settings] = await Promise.all([
    prisma.attendanceSummary.findUnique({ where: { teacherId_month_year: { teacherId: id, month, year } } }),
    prisma.payroll.findUnique({ where: { teacherId_month_year: { teacherId: id, month, year } } }),
    prisma.salarySettings.findUnique({ where: { id: "main" } }),
  ]);

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title={`Attendance — ${teacher.name}`}
        description={`${month}/${year} — payroll generation reads these totals automatically`}
      />
      <AttendanceForm
        key={`${id}-${month}-${year}-${existing?.updatedAt.toISOString() ?? "new"}`}
        teacherId={id}
        month={month}
        year={year}
        locked={Boolean(payroll?.locked)}
        defaultWorkingDays={existing?.workingDays ?? settings?.workingDaysPerMonth ?? 26}
        defaultAbsentDays={existing?.absentDays ?? 0}
        defaultHalfDays={existing?.halfDays ?? 0}
        defaultPaidLeaveDays={existing?.paidLeaveDays ?? 0}
        defaultUnpaidLeaveDays={existing?.unpaidLeaveDays ?? 0}
        defaultLateCount={existing?.lateCount ?? 0}
      />
    </div>
  );
}
