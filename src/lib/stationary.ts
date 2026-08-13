import { prisma } from "@/lib/db";

export async function getSaleSummary(saleId: string) {
  const sale = await prisma.stationarySale.findUnique({
    where: { id: saleId },
    include: {
      student: { include: { standard: true } },
      items: true,
      payments: { orderBy: { paymentDate: "desc" } },
    },
  });
  if (!sale) return null;

  const totalPaid = sale.payments.reduce((sum, p) => sum + p.amount, 0);
  const balance = sale.totalAmount - totalPaid;

  return {
    sale,
    totalPaid,
    balance, // positive = due, negative = advance
    due: Math.max(0, balance),
    advance: Math.max(0, -balance),
  };
}

export async function getPendingStationaryReport() {
  const sales = await prisma.stationarySale.findMany({
    include: { student: true, payments: true },
    orderBy: { saleDate: "desc" },
  });

  const pending = sales
    .map((sale) => {
      const totalPaid = sale.payments.reduce((sum, p) => sum + p.amount, 0);
      const due = Math.max(0, sale.totalAmount - totalPaid);
      return { sale, totalPaid, due };
    })
    .filter((s) => s.due > 0)
    .sort((a, b) => b.due - a.due);

  const grandTotal = pending.reduce((sum, s) => sum + s.due, 0);

  return { grandTotal, pending };
}
