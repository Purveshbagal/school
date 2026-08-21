import { randomBytes } from "crypto";
import { prisma } from "@/lib/db";

export const FINAL_RESULT_NAME = "Final Result";

/** Makes sure the single "Final Result" exam exists, creating it on first
 * access (same lazily-created-singleton pattern as SchoolSettings). Its
 * public link aggregates a student's results across every real exam/term
 * instead of holding marks of its own — see Exam.isFinal in schema.prisma. */
export async function ensureFinalResultExam() {
  const existing = await prisma.exam.findFirst({ where: { isFinal: true } });
  if (existing) return existing;

  const now = new Date();
  return prisma.exam.create({
    data: {
      name: FINAL_RESULT_NAME,
      examDate: now,
      resultDate: now,
      isFinal: true,
      resultToken: randomBytes(16).toString("hex"),
    },
  });
}
