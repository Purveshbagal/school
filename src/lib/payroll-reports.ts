import { prisma } from "@/lib/db";

export async function getMonthlySalaryReport(month: number, year: number) {
  return prisma.payroll.findMany({
    where: { month, year, deletedAt: null },
    include: { teacher: true },
    orderBy: { netPayable: "desc" },
  });
}

export async function getTeacherWiseReport() {
  const teachers = await prisma.teacher.findMany({
    orderBy: { name: "asc" },
    include: { payrolls: { where: { deletedAt: null } } },
  });
  return teachers.map((t) => ({
    teacher: t,
    totalGenerated: t.payrolls.reduce((s, p) => s + p.netPayable, 0),
    totalPaid: t.payrolls.reduce((s, p) => s + p.paidAmount, 0),
    totalPending: t.payrolls.reduce((s, p) => s + Math.max(0, p.pendingAmount), 0),
    payrollCount: t.payrolls.length,
  }));
}

export async function getAdvanceReport() {
  return prisma.advancePayment.findMany({
    where: { deletedAt: null },
    include: { teacher: true },
    orderBy: { date: "desc" },
    take: 500,
  });
}

export async function getPendingSalaryReport() {
  return prisma.payroll.findMany({
    where: { deletedAt: null, pendingAmount: { gt: 0 } },
    include: { teacher: true },
    orderBy: { pendingAmount: "desc" },
  });
}

export async function getPaymentHistoryReport() {
  return prisma.salaryPayment.findMany({
    where: { deletedAt: null },
    include: { teacher: true, payroll: true },
    orderBy: { paymentDate: "desc" },
    take: 500,
  });
}

export async function getLedgerReport() {
  return prisma.salaryLedger.findMany({
    include: { teacher: true },
    orderBy: { date: "desc" },
    take: 500,
  });
}

export function toCsv(headers: string[], rows: (string | number)[][]): string {
  const esc = (v: string | number) => {
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers.map(esc).join(","), ...rows.map((r) => r.map(esc).join(","))].join("\n");
}
