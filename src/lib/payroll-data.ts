import { prisma } from "@/lib/db";
import { nextPeriod } from "@/lib/payroll-engine";

export async function getActiveSalaryStructure(teacherId: string) {
  return prisma.salaryStructure.findFirst({
    where: { teacherId, status: "ACTIVE", deletedAt: null },
    orderBy: { effectiveFrom: "desc" },
  });
}

/** Sum of advance money not yet applied against a payroll. */
export async function getOutstandingAdvanceTotal(teacherId: string): Promise<number> {
  const advances = await prisma.advancePayment.findMany({
    where: { teacherId, deletedAt: null, status: { in: ["UNADJUSTED", "PARTIALLY_ADJUSTED"] } },
  });
  return advances.reduce((sum, a) => sum + (a.amount - a.adjustedAmount), 0);
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

  const outstandingAdvance = advances.reduce(
    (sum, a) => (a.status !== "ADJUSTED" ? sum + (a.amount - a.adjustedAmount) : sum),
    0
  );
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
