import { prisma } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";

export async function getBusExpenseSummary(
  busId: string,
  dateRange?: { start?: Date; end?: Date }
) {
  const bus = await prisma.bus.findUnique({ where: { id: busId } });
  if (!bus) return null;

  const where: Prisma.BusExpenseWhereInput = {
    busId,
    ...(dateRange?.start && dateRange?.end
      ? { date: { gte: dateRange.start, lte: dateRange.end } }
      : {}),
  };

  const expenses = await prisma.busExpense.findMany({
    where,
    orderBy: { date: "desc" },
  });

  const totalExpense = expenses.reduce((sum, e) => sum + e.amount, 0);

  return { bus, expenses, totalExpense };
}
