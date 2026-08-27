import type { Prisma } from "@/generated/prisma/client";
import { calcPayroll, type CalculationType, type AttendanceInput, type PayrollSettingsInput } from "@/lib/payroll-engine";

const DEFAULT_ROUND_OFF = true;

const DEFAULT_SETTINGS: PayrollSettingsInput = {
  workingDaysPerMonth: 26,
  halfDayDeductionRule: 0.5,
  absentDeductionRule: 1,
  lateRuleThreshold: 3,
  lateDeductionPerOccurrence: 0,
  roundOff: true,
  pfEnabled: false,
  pfRate: 0,
  esicEnabled: false,
  esicRate: 0,
  professionalTaxEnabled: false,
  professionalTaxAmount: 0,
};

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

/**
 * Re-derives a payroll's attendance-driven figures (day counts, gross salary, leave/half-day/
 * late deductions, statutory deductions) from a corrected AttendanceSummary, then folds them
 * into netPayable via recomputePayrollTotals. No-ops if no payroll exists yet for this period,
 * or if it's locked — locked is the same gate every other post-generation edit already respects,
 * and `saveAttendanceSummaryAction` already blocks the attendance save itself when locked.
 * Call inside the same transaction as the AttendanceSummary create/update.
 */
export async function syncPayrollAttendanceIfExists(
  tx: Prisma.TransactionClient,
  teacherId: string,
  month: number,
  year: number,
  attendance: AttendanceInput & { paidLeaveDays: number }
) {
  const payroll = await tx.payroll.findUnique({
    where: { teacherId_month_year: { teacherId, month, year } },
  });
  if (!payroll || payroll.deletedAt || payroll.locked) return;

  const structure = payroll.salaryStructureId
    ? await tx.salaryStructure.findUnique({ where: { id: payroll.salaryStructureId } })
    : null;
  if (!structure) return;

  const settingsDoc = await tx.salarySettings.findUnique({ where: { id: "main" } });
  const settings: PayrollSettingsInput = settingsDoc
    ? {
        workingDaysPerMonth: settingsDoc.workingDaysPerMonth,
        halfDayDeductionRule: settingsDoc.halfDayDeductionRule,
        absentDeductionRule: settingsDoc.absentDeductionRule,
        lateRuleThreshold: settingsDoc.lateRuleThreshold,
        lateDeductionPerOccurrence: settingsDoc.lateDeductionPerOccurrence,
        roundOff: settingsDoc.roundOff,
        pfEnabled: settingsDoc.pfEnabled,
        pfRate: settingsDoc.pfRate,
        esicEnabled: settingsDoc.esicEnabled,
        esicRate: settingsDoc.esicRate,
        professionalTaxEnabled: settingsDoc.professionalTaxEnabled,
        professionalTaxAmount: settingsDoc.professionalTaxAmount,
      }
    : DEFAULT_SETTINGS;

  const result = calcPayroll({
    monthlySalary: structure.monthlySalary,
    calculationType: structure.calculationType as CalculationType,
    attendance,
    settings,
    manualDeductionsTotal: 0,
    bonusTotal: 0,
    advanceApplied: 0,
    previousPending: 0,
    paidAmount: 0,
  });

  const presentDays = Math.max(
    0,
    attendance.workingDays - attendance.absentDays - attendance.halfDays - attendance.paidLeaveDays - attendance.unpaidLeaveDays
  );

  await tx.payroll.update({
    where: { id: payroll.id },
    data: {
      workingDays: attendance.workingDays,
      presentDays,
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
    },
  });

  await recomputePayrollTotals(tx, payroll.id);
}
