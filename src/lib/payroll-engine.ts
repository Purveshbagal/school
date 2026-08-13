/**
 * Pure salary-calculation functions. No I/O — callers pass in the SalaryStructure,
 * AttendanceSummary, SalarySettings, and line-item totals; this module has no
 * knowledge of Prisma or Next.js.
 */

export type CalculationType = "MONTHLY" | "PER_DAY" | "CUSTOM";

export type PayrollSettingsInput = {
  workingDaysPerMonth: number;
  halfDayDeductionRule: number;
  absentDeductionRule: number;
  lateRuleThreshold: number;
  lateDeductionPerOccurrence: number;
  roundOff: boolean;
  pfEnabled: boolean;
  pfRate: number;
  esicEnabled: boolean;
  esicRate: number;
  professionalTaxEnabled: boolean;
  professionalTaxAmount: number;
};

export type AttendanceInput = {
  workingDays: number;
  absentDays: number;
  halfDays: number;
  unpaidLeaveDays: number;
  lateCount: number;
};

/** Present days implied by the other attendance buckets (paid leave counts as present-equivalent, it's not a deduction). */
export function calcPresentDays(input: {
  workingDays: number;
  absentDays: number;
  halfDays: number;
  paidLeaveDays: number;
  unpaidLeaveDays: number;
}) {
  return Math.max(
    0,
    input.workingDays - input.absentDays - input.halfDays - input.paidLeaveDays - input.unpaidLeaveDays
  );
}

/** Absent days implied by directly-entered present days. */
export function calcAbsentDays(input: {
  workingDays: number;
  presentDays: number;
  halfDays: number;
  paidLeaveDays: number;
  unpaidLeaveDays: number;
}) {
  return Math.max(
    0,
    input.workingDays - input.presentDays - input.halfDays - input.paidLeaveDays - input.unpaidLeaveDays
  );
}

export function perDayRate(
  monthlySalary: number,
  calculationType: CalculationType,
  settings: Pick<PayrollSettingsInput, "workingDaysPerMonth">
): number {
  if (calculationType === "PER_DAY") return monthlySalary;
  return monthlySalary / (settings.workingDaysPerMonth || 26);
}

export function calcGrossSalary(
  monthlySalary: number,
  calculationType: CalculationType,
  attendance: Pick<AttendanceInput, "workingDays">,
  settings: Pick<PayrollSettingsInput, "workingDaysPerMonth">
): number {
  if (calculationType === "PER_DAY") return monthlySalary * attendance.workingDays;
  return monthlySalary;
}

export type PayrollCalcResult = {
  perDayRate: number;
  grossSalary: number;
  leaveDeduction: number;
  halfDayDeduction: number;
  lateDeduction: number;
  pfAmount: number;
  esicAmount: number;
  professionalTaxAmount: number;
  otherDeductionsTotal: number;
  bonusTotal: number;
  netPayable: number;
  pendingAmount: number;
  status: "GENERATED" | "PARTIALLY_PAID" | "PAID";
};

/**
 * Core payroll formula:
 * Gross - Leave - HalfDay - Late - OtherDeductions + Bonus - AdvanceApplied + PreviousPending = Net Payable
 */
export function calcPayroll(input: {
  monthlySalary: number;
  calculationType: CalculationType;
  attendance: AttendanceInput;
  settings: PayrollSettingsInput;
  manualDeductionsTotal: number;
  bonusTotal: number;
  advanceApplied: number;
  previousPending: number;
  paidAmount: number;
}): PayrollCalcResult {
  const { attendance, settings } = input;

  const rate = perDayRate(input.monthlySalary, input.calculationType, settings);
  const grossSalary = calcGrossSalary(input.monthlySalary, input.calculationType, attendance, settings);

  const unpaidAbsenceDays = attendance.absentDays + attendance.unpaidLeaveDays;
  const leaveDeduction = rate * unpaidAbsenceDays * settings.absentDeductionRule;
  const halfDayDeduction = rate * attendance.halfDays * settings.halfDayDeductionRule;
  const lateOccurrencesOverThreshold = Math.max(0, attendance.lateCount - settings.lateRuleThreshold);
  const lateDeduction = settings.lateDeductionPerOccurrence * lateOccurrencesOverThreshold;

  const pfAmount = settings.pfEnabled ? (grossSalary * settings.pfRate) / 100 : 0;
  const esicAmount = settings.esicEnabled ? (grossSalary * settings.esicRate) / 100 : 0;
  const professionalTaxAmount = settings.professionalTaxEnabled ? settings.professionalTaxAmount : 0;

  const otherDeductionsTotal = input.manualDeductionsTotal + pfAmount + esicAmount + professionalTaxAmount;

  let netPayable =
    grossSalary -
    leaveDeduction -
    halfDayDeduction -
    lateDeduction -
    otherDeductionsTotal +
    input.bonusTotal -
    input.advanceApplied +
    input.previousPending;

  netPayable = Math.max(0, netPayable);
  if (settings.roundOff) netPayable = Math.round(netPayable);

  const pendingAmount = netPayable - input.paidAmount;
  const status = pendingAmount <= 0 ? "PAID" : input.paidAmount > 0 ? "PARTIALLY_PAID" : "GENERATED";

  return {
    perDayRate: rate,
    grossSalary,
    leaveDeduction,
    halfDayDeduction,
    lateDeduction,
    pfAmount,
    esicAmount,
    professionalTaxAmount,
    otherDeductionsTotal,
    bonusTotal: input.bonusTotal,
    netPayable,
    pendingAmount,
    status,
  };
}

export function nextPeriod(month: number, year: number): { month: number; year: number } {
  return month === 12 ? { month: 1, year: year + 1 } : { month: month + 1, year };
}

export const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
] as const;
