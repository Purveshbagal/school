import { prisma } from "@/lib/db";
import { calcPayroll, nextPeriod, type CalculationType } from "@/lib/payroll-engine";
import { getSalarySettings } from "@/lib/salary-settings";

export async function getActiveSalaryStructure(teacherId: string) {
  return prisma.salaryStructure.findFirst({
    where: { teacherId, status: "ACTIVE", deletedAt: null },
    orderBy: { effectiveFrom: "desc" },
  });
}

/**
 * Sum of advance money not yet applied against a payroll. Sums amount - adjustedAmount
 * directly across every advance rather than filtering by the `status` label — status is
 * a derived convenience field that can drift out of sync with the actual figures, and
 * filtering by it can silently hide a real outstanding balance.
 */
export async function getOutstandingAdvanceTotal(teacherId: string): Promise<number> {
  const advances = await prisma.advancePayment.findMany({
    where: { teacherId, deletedAt: null },
  });
  return advances.reduce((sum, a) => sum + Math.max(0, a.amount - a.adjustedAmount), 0);
}

/**
 * Advance balance remaining as of a given payroll period — i.e. after that month's own
 * deduction has been counted, not the teacher's live/current balance. Used so an older
 * salary slip keeps showing what was true back then instead of drifting as later months
 * get deducted. Only counts advances actually given by that period, and only installment
 * deductions actually applied on/before that period (by month/year, not calendar date).
 */
export async function getOutstandingAdvanceAsOfPeriod(teacherId: string, month: number, year: number): Promise<number> {
  const periodKey = year * 12 + month;

  const [advances, installments] = await Promise.all([
    prisma.advancePayment.findMany({ where: { teacherId, deletedAt: null } }),
    prisma.advanceInstallment.findMany({ where: { teacherId, deletedAt: null } }),
  ]);

  const appliedByAdvance = new Map<string, number>();
  for (const i of installments) {
    if (i.year * 12 + i.month > periodKey) continue;
    appliedByAdvance.set(i.advancePaymentId, (appliedByAdvance.get(i.advancePaymentId) || 0) + i.appliedAmount);
  }

  return advances.reduce((sum, a) => {
    const givenKey = a.date.getFullYear() * 12 + (a.date.getMonth() + 1);
    if (givenKey > periodKey) return sum;
    const appliedByThen = appliedByAdvance.get(a.id) || 0;
    return sum + Math.max(0, a.amount - appliedByThen);
  }, 0);
}

export async function getLastPayroll(teacherId: string) {
  return prisma.payroll.findFirst({
    where: { teacherId, deletedAt: null },
    orderBy: [{ year: "desc" }, { month: "desc" }],
  });
}

/** Positive pending balance from the month immediately before the given period, for carry-forward. */
export async function getPreviousPending(teacherId: string, month: number, year: number): Promise<number> {
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;
  const prev = await prisma.payroll.findFirst({
    where: { teacherId, month: prevMonth, year: prevYear, deletedAt: null },
  });
  return prev ? Math.max(0, prev.pendingAmount) : 0;
}

export async function getNextPayrollPeriod(teacherId: string) {
  const last = await getLastPayroll(teacherId);
  if (last) return nextPeriod(last.month, last.year);
  const now = new Date();
  return { month: now.getMonth() + 1, year: now.getFullYear() };
}

/**
 * Computes what a payroll for this period would look like, without persisting anything.
 * Shares the exact formula generatePayrollAction uses, so the preview always matches
 * what actually gets saved when the teacher confirms it.
 */
export async function getPayrollPreview(teacherId: string, month: number, year: number) {
  const [structure, attendance] = await Promise.all([
    getActiveSalaryStructure(teacherId),
    prisma.attendanceSummary.findUnique({ where: { teacherId_month_year: { teacherId, month, year } } }),
  ]);

  if (!structure || !attendance) {
    return { ok: false, hasStructure: Boolean(structure), hasAttendance: Boolean(attendance) } as const;
  }

  const [settings, previousPending, dueInstallments] = await Promise.all([
    getSalarySettings(),
    getPreviousPending(teacherId, month, year),
    prisma.advanceInstallment.findMany({
      where: { teacherId, month, year, status: "PENDING", deletedAt: null },
      orderBy: { createdAt: "asc" },
    }),
  ]);
  const scheduledDeduction = dueInstallments.reduce((sum, i) => sum + (i.amount - i.appliedAmount), 0);

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
  const advanceApplied = Math.min(scheduledDeduction, preAdvance.netPayable);

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

  return {
    ok: true,
    hasStructure: true,
    hasAttendance: true,
    structure,
    presentDays: Math.max(
      0,
      attendance.workingDays - attendance.absentDays - attendance.halfDays - attendance.paidLeaveDays - attendance.unpaidLeaveDays
    ),
    workingDays: attendance.workingDays,
    absentDays: attendance.absentDays,
    halfDays: attendance.halfDays,
    paidLeaveDays: attendance.paidLeaveDays,
    unpaidLeaveDays: attendance.unpaidLeaveDays,
    lateCount: attendance.lateCount,
    previousPending,
    advanceApplied,
    result,
  } as const;
}

export async function getTeacherPayrollOverview(teacherId: string) {
  const teacher = await prisma.teacher.findUnique({ where: { id: teacherId } });
  if (!teacher) return null;

  const [activeStructure, revisions, advances, payrolls] = await Promise.all([
    getActiveSalaryStructure(teacherId),
    prisma.salaryRevision.findMany({ where: { teacherId, deletedAt: null }, orderBy: { effectiveFrom: "desc" } }),
    prisma.advancePayment.findMany({ where: { teacherId, deletedAt: null }, orderBy: { date: "desc" } }),
    prisma.payroll.findMany({
      where: { teacherId, deletedAt: null },
      orderBy: [{ year: "desc" }, { month: "desc" }],
      include: { bonuses: true, deductions: true, payments: true },
    }),
  ]);

  const outstandingAdvance = advances.reduce((sum, a) => sum + Math.max(0, a.amount - a.adjustedAmount), 0);
  const lastPayroll = payrolls[0] || null;
  const pendingFromLastPayroll = lastPayroll ? Math.max(0, lastPayroll.pendingAmount) : 0;
  const nextPayrollPeriod = lastPayroll
    ? nextPeriod(lastPayroll.month, lastPayroll.year)
    : { month: new Date().getMonth() + 1, year: new Date().getFullYear() };

  return {
    teacher,
    activeStructure,
    revisions,
    advances,
    payrolls,
    outstandingAdvance,
    lastPayroll,
    pendingFromLastPayroll,
    nextPayrollPeriod,
  };
}
