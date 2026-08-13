import type { Prisma } from "@/generated/prisma/client";

const DEFAULT_ROUND_OFF = true;

/**
 * Re-derives netPayable/pendingAmount/status from a Payroll's frozen generation-time
 * figures (gross, leave/half-day/late deductions, advanceApplied, previousPending) plus
 * its live Bonus/SalaryDeduction line items and paidAmount. Call inside the same
 * transaction after adding/removing a bonus, deduction, or payment.
 */
export async function recomputePayrollTotals(tx: Prisma.TransactionClient, payrollId: string) {
  const payroll = await tx.payroll.findUniqueOrThrow({
    where: { id: payrollId },
    include: { bonuses: true, deductions: true },
  });

  const settings = await tx.salarySettings.findUnique({ where: { id: "main" } });
  const roundOff = settings?.roundOff ?? DEFAULT_ROUND_OFF;

  const bonusTotal = payroll.bonuses
    .filter((b) => !b.deletedAt)
    .reduce((sum, b) => sum + b.amount, 0);
  const manualDeductions = payroll.deductions
    .filter((d) => !d.deletedAt)
    .reduce((sum, d) => sum + d.amount, 0);
  const otherDeductionsTotal = payroll.statutoryDeductionsTotal + manualDeductions;

  let netPayable =
    payroll.grossSalary -
    payroll.leaveDeduction -
    payroll.halfDayDeduction -
    payroll.lateDeduction -
    otherDeductionsTotal +
    bonusTotal -
    payroll.advanceApplied +
    payroll.previousPending;

  netPayable = Math.max(0, netPayable);
  if (roundOff) netPayable = Math.round(netPayable);

  const pendingAmount = netPayable - payroll.paidAmount;
  const status = pendingAmount <= 0 ? "PAID" : payroll.paidAmount > 0 ? "PARTIALLY_PAID" : "GENERATED";

  return tx.payroll.update({
    where: { id: payrollId },
    data: { bonusTotal, otherDeductionsTotal, netPayable, pendingAmount, status },
  });
}
