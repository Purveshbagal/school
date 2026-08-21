"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { writeLedgerEntry } from "@/lib/ledger";
import { createNotification } from "@/lib/notify";
import { nextPayrollInvoiceNo } from "@/lib/ids";
import { calcPayroll, type CalculationType } from "@/lib/payroll-engine";
import { getActiveSalaryStructure, getPreviousPending } from "@/lib/payroll-data";
import { getSalarySettings } from "@/lib/salary-settings";
import { formatCurrency } from "@/lib/utils";

export async function generatePayrollAction(
  _prevState: { error?: string; success?: boolean } | undefined,
  formData: FormData
): Promise<{ error?: string; success?: boolean }> {
  const teacherId = String(formData.get("teacherId") || "");
  const month = Number(formData.get("month") || 0);
  const year = Number(formData.get("year") || 0);

  if (!teacherId || !month || !year) {
    return { error: "Please select a teacher, month and year" };
  }

  const teacher = await prisma.teacher.findUnique({ where: { id: teacherId } });
  if (!teacher) return { error: "Teacher not found" };

  const existing = await prisma.payroll.findUnique({
    where: { teacherId_month_year: { teacherId, month, year } },
  });
  if (existing && !existing.deletedAt) {
    return { error: `Salary for this period has already been generated (${existing.invoiceNo}).` };
  }

  const structure = await getActiveSalaryStructure(teacherId);
  if (!structure) {
    return { error: "This teacher has no active salary structure. Assign one first." };
  }

  const attendance = await prisma.attendanceSummary.findUnique({
    where: { teacherId_month_year: { teacherId, month, year } },
  });
  if (!attendance) {
    return { error: "No attendance summary saved for this period. Save attendance first." };
  }

  const settings = await getSalarySettings();
  const previousPending = await getPreviousPending(teacherId, month, year);

  const outstandingAdvances = await prisma.advancePayment.findMany({
    where: { teacherId, deletedAt: null, status: { in: ["UNADJUSTED", "PARTIALLY_ADJUSTED"] } },
    orderBy: { date: "asc" },
  });
  const outstandingAdvanceTotal = outstandingAdvances.reduce((sum, a) => sum + (a.amount - a.adjustedAmount), 0);

  const attendanceInput = {
    workingDays: attendance.workingDays,
    absentDays: attendance.absentDays,
    halfDays: attendance.halfDays,
    unpaidLeaveDays: attendance.unpaidLeaveDays,
    lateCount: attendance.lateCount,
  };
  const settingsInput = {
    workingDaysPerMonth: settings.workingDaysPerMonth,
    halfDayDeductionRule: settings.halfDayDeductionRule,
    absentDeductionRule: settings.absentDeductionRule,
    lateRuleThreshold: settings.lateRuleThreshold,
    lateDeductionPerOccurrence: settings.lateDeductionPerOccurrence,
    roundOff: settings.roundOff,
    pfEnabled: settings.pfEnabled,
    pfRate: settings.pfRate,
    esicEnabled: settings.esicEnabled,
    esicRate: settings.esicRate,
    professionalTaxEnabled: settings.professionalTaxEnabled,
    professionalTaxAmount: settings.professionalTaxAmount,
  };

  // Figure out how much advance to actually apply: never more than what's owed before advance.
  const preAdvance = calcPayroll({
    monthlySalary: structure.monthlySalary,
    calculationType: structure.calculationType as CalculationType,
    attendance: attendanceInput,
    settings: settingsInput,
    manualDeductionsTotal: 0,
    bonusTotal: 0,
    advanceApplied: 0,
    previousPending,
    paidAmount: 0,
  });
  const advanceApplied = Math.min(outstandingAdvanceTotal, preAdvance.netPayable);

  const result = calcPayroll({
    monthlySalary: structure.monthlySalary,
    calculationType: structure.calculationType as CalculationType,
    attendance: attendanceInput,
    settings: settingsInput,
    manualDeductionsTotal: 0,
    bonusTotal: 0,
    advanceApplied,
    previousPending,
    paidAmount: 0,
  });

  const session = await getSession();
  const invoiceNo = await nextPayrollInvoiceNo();

  const payroll = await prisma.$transaction(async (tx) => {
    const created = await tx.payroll.create({
      data: {
        teacherId,
        month,
        year,
        invoiceNo,
        salaryStructureId: structure.id,
        workingDays: attendance.workingDays,
        presentDays: Math.max(
          0,
          attendance.workingDays - attendance.absentDays - attendance.halfDays - attendance.paidLeaveDays - attendance.unpaidLeaveDays
        ),
        absentDays: attendance.absentDays,
        halfDays: attendance.halfDays,
        paidLeaveDays: attendance.paidLeaveDays,
        unpaidLeaveDays: attendance.unpaidLeaveDays,
        lateCount: attendance.lateCount,
        grossSalary: result.grossSalary,
        leaveDeduction: result.leaveDeduction,
        halfDayDeduction: result.halfDayDeduction,
        lateDeduction: result.lateDeduction,
        statutoryDeductionsTotal: result.pfAmount + result.esicAmount + result.professionalTaxAmount,
        otherDeductionsTotal: result.otherDeductionsTotal,
        bonusTotal: 0,
        advanceApplied,
        previousPending,
        netPayable: result.netPayable,
        paidAmount: 0,
        pendingAmount: result.pendingAmount,
        status: result.status,
        deletedAt: null,
        createdBy: session?.username,
      },
    });

    // Consume outstanding advances oldest-first up to advanceApplied.
    let remaining = advanceApplied;
    for (const adv of outstandingAdvances) {
      if (remaining <= 0) break;
      const available = adv.amount - adv.adjustedAmount;
      const consume = Math.min(available, remaining);
      const newAdjusted = adv.adjustedAmount + consume;
      await tx.advancePayment.update({
        where: { id: adv.id },
        data: {
          adjustedAmount: newAdjusted,
          status: newAdjusted >= adv.amount ? "ADJUSTED" : "PARTIALLY_ADJUSTED",
          updatedBy: session?.username,
        },
      });
      remaining -= consume;
    }

    await writeLedgerEntry(tx, {
      teacherId,
      type: "SALARY_GENERATED",
      amount: result.netPayable,
      description: `Salary generated for ${month}/${year} — Net Payable ${formatCurrency(result.netPayable)}`,
      refId: created.id,
      createdBy: session?.username,
    });

    await createNotification(tx, {
      type: "SALARY_GENERATED",
      audience: "ADMIN",
      teacherId,
      title: "Salary generated",
      message: `${teacher.name}'s salary for ${month}/${year} has been generated — Net Payable ${formatCurrency(result.netPayable)}.`,
      createdBy: session?.username,
    });

    return created;
  });

  revalidatePath("/payroll");
  revalidatePath("/salary-slips");
  revalidatePath("/advance-payments");
  return { success: true };
}

export async function lockPayrollAction(
  _prevState: { error?: string } | undefined,
  formData: FormData
): Promise<{ error?: string }> {
  const id = String(formData.get("id") || "");
  const session = await getSession();

  const payroll = await prisma.payroll.findUnique({ where: { id } });
  if (!payroll) return { error: "Payroll not found" };

  await prisma.$transaction(async (tx) => {
    await tx.payroll.update({
      where: { id },
      data: { locked: true, lockedAt: new Date(), lockedBy: session?.username },
    });
    await writeLedgerEntry(tx, {
      teacherId: payroll.teacherId,
      type: "PAYROLL_LOCKED",
      description: `Payroll for ${payroll.month}/${payroll.year} locked`,
      refId: id,
      createdBy: session?.username,
    });
  });

  revalidatePath(`/payroll/${payroll.teacherId}`);
  revalidatePath("/payroll");
  return {};
}

export async function unlockPayrollAction(
  _prevState: { error?: string } | undefined,
  formData: FormData
): Promise<{ error?: string }> {
  const id = String(formData.get("id") || "");
  const session = await getSession();

  if (session?.role !== "admin") {
    return { error: "Only an admin can unlock a payroll." };
  }

  const payroll = await prisma.payroll.findUnique({ where: { id } });
  if (!payroll) return { error: "Payroll not found" };

  await prisma.$transaction(async (tx) => {
    await tx.payroll.update({
      where: { id },
      data: { locked: false, lockedAt: null, lockedBy: null },
    });
    await writeLedgerEntry(tx, {
      teacherId: payroll.teacherId,
      type: "PAYROLL_UNLOCKED",
      description: `Payroll for ${payroll.month}/${payroll.year} unlocked`,
      refId: id,
      createdBy: session?.username,
    });
  });

  revalidatePath(`/payroll/${payroll.teacherId}`);
  revalidatePath("/payroll");
  return {};
}
