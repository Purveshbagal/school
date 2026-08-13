"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { writeLedgerEntry } from "@/lib/ledger";

export async function saveAttendanceSummaryAction(
  _prevState: { error?: string } | undefined,
  formData: FormData
): Promise<{ error?: string } | never> {
  const teacherId = String(formData.get("teacherId") || "");
  const month = Number(formData.get("month") || 0);
  const year = Number(formData.get("year") || 0);
  const workingDays = Number(formData.get("workingDays") || 0);
  const absentDays = Number(formData.get("absentDays") || 0);
  const halfDays = Number(formData.get("halfDays") || 0);
  const paidLeaveDays = Number(formData.get("paidLeaveDays") || 0);
  const unpaidLeaveDays = Number(formData.get("unpaidLeaveDays") || 0);
  const lateCount = Number(formData.get("lateCount") || 0);

  if (!teacherId || !month || !year || workingDays <= 0) {
    return { error: "Please fill month, year and working days correctly" };
  }

  const lockedPayroll = await prisma.payroll.findFirst({
    where: { teacherId, month, year, locked: true, deletedAt: null },
  });
  if (lockedPayroll) {
    return { error: "This month's payroll is locked — unlock it before editing attendance." };
  }

  const session = await getSession();

  await prisma.$transaction(async (tx) => {
    const existing = await tx.attendanceSummary.findUnique({
      where: { teacherId_month_year: { teacherId, month, year } },
    });

    if (existing) {
      await tx.attendanceSummary.update({
        where: { id: existing.id },
        data: {
          workingDays, absentDays, halfDays, paidLeaveDays, unpaidLeaveDays, lateCount,
          updatedBy: session?.username,
        },
      });
    } else {
      await tx.attendanceSummary.create({
        data: {
          teacherId, month, year,
          workingDays, absentDays, halfDays, paidLeaveDays, unpaidLeaveDays, lateCount,
          deletedAt: null,
          createdBy: session?.username,
        },
      });
    }

    await writeLedgerEntry(tx, {
      teacherId,
      type: "ATTENDANCE_SAVED",
      description: `Attendance summary saved for ${month}/${year} (present-equivalent days, ${absentDays} absent, ${halfDays} half-day)`,
      createdBy: session?.username,
    });
  });

  revalidatePath("/attendance");
  revalidatePath(`/attendance/${teacherId}`);
  revalidatePath(`/payroll/${teacherId}`);
  redirect(`/attendance/${teacherId}?month=${month}&year=${year}`);
}
