import { prisma } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";

export async function getTeacherPaymentSummary(
  teacherId: string,
  dateRange?: { start?: Date; end?: Date }
) {
  const teacher = await prisma.teacher.findUnique({ where: { id: teacherId } });
  if (!teacher) return null;

  const where: Prisma.TeacherAdvanceWhereInput = {
    teacherId,
    ...(dateRange?.start && dateRange?.end
      ? { date: { gte: dateRange.start, lte: dateRange.end } }
      : {}),
  };

  const advances = await prisma.teacherAdvance.findMany({
    where,
    orderBy: { date: "desc" },
  });

  const totalPaid = advances.reduce((sum, a) => sum + a.amount, 0);

  return { teacher, advances, totalPaid };
}
