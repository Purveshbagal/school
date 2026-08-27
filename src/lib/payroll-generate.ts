import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { writeLedgerEntry } from "@/lib/ledger";
import { createNotification } from "@/lib/notify";
import { nextPayrollInvoiceNo } from "@/lib/ids";
import { getPayrollPreview } from "@/lib/payroll-data";
import { formatCurrency } from "@/lib/utils";
import { applyToInstallment } from "@/lib/advance-installments";

/**
 * Creates the Payroll record for a teacher/period from the current attendance summary
 * and active salary structure — the same computation GeneratePayrollForm previews.
 * Used both by the manual "Confirm & Generate" action and by auto-generation right
 * after an attendance summary is saved.
 */
export async function generatePayrollForPeriod(
  teacherId: string,
  month: number,
  year: number,
  createdBy?: string
): Promise<{ ok: true; netPayable: number } | { ok: false; error: string }> {
  const teacher = await prisma.teacher.findUnique({ where: { id: teacherId } });
  if (!teacher) return { ok: false, error: "Teacher not found" };

  const existing = await prisma.payroll.findUnique({
    where: { teacherId_month_year: { teacherId, month, year } },
  });
  if (existing && !existing.deletedAt) {
    return { ok: false, error: `Salary for this period has already been generated (${existing.invoiceNo}).` };
  }

  const preview = await getPayrollPreview(teacherId, month, year);
  if (!preview.ok) {
    return {
      ok: false,
      error: !preview.hasStructure
        ? "This teacher has no active salary structure. Assign one first."
        : "No attendance summary saved for this period. Save attendance first.",
    };
  }

  const { structure, result, previousPending, advanceApplied } = preview;

  const dueInstallments = await prisma.advanceInstallment.findMany({
    where: { teacherId, month, year, status: "PENDING", deletedAt: null },
    orderBy: { createdAt: "asc" },
  });

  const invoiceNo = await nextPayrollInvoiceNo();

  try {
    await prisma.$transaction(async (tx) => {
      const created = await tx.payroll.create({
        data: {
          teacherId,
          month,
          year,
          invoiceNo,
          salaryStructureId: structure.id,
          workingDays: preview.workingDays,
          presentDays: preview.presentDays,
          absentDays: preview.absentDays,
          halfDays: preview.halfDays,
          paidLeaveDays: preview.paidLeaveDays,
          unpaidLeaveDays: preview.unpaidLeaveDays,
          lateCount: preview.lateCount,
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
          createdBy,
        },
      });

      // Consume this month's due installments oldest-first up to advanceApplied.
      let remaining = advanceApplied;
      for (const installment of dueInstallments) {
        if (remaining <= 0) break;
        const available = installment.amount - installment.appliedAmount;
        const consume = Math.min(available, remaining);
        await applyToInstallment(tx, installment, { id: created.id, teacherId, month, year }, consume, createdBy);
        remaining -= consume;
      }

      await writeLedgerEntry(tx, {
        teacherId,
        type: "SALARY_GENERATED",
        amount: result.netPayable,
        description: `Salary generated for ${month}/${year} — Net Payable ${formatCurrency(result.netPayable)}`,
        refId: created.id,
        createdBy,
      });

      await createNotification(tx, {
        type: "SALARY_GENERATED",
        audience: "ADMIN",
        teacherId,
        title: "Salary generated",
        message: `${teacher.name}'s salary for ${month}/${year} has been generated — Net Payable ${formatCurrency(result.netPayable)}.`,
        createdBy,
      });
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && (e.code === "P2002" || e.message.includes("write conflict"))) {
      return { ok: false, error: "Salary for this period may have already been generated. Please refresh and check before retrying." };
    }
    throw e;
  }

  return { ok: true, netPayable: result.netPayable };
}
