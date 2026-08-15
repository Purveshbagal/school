"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";

export async function createExamAction(formData: FormData): Promise<void> {
  const name = String(formData.get("name") || "").trim();
  const examDateRaw = String(formData.get("examDate") || "");
  const resultDateRaw = String(formData.get("resultDate") || "");
  if (!name || !examDateRaw || !resultDateRaw) return;

  await prisma.exam.create({
    data: {
      name,
      examDate: new Date(examDateRaw),
      resultDate: new Date(resultDateRaw),
    },
  });
  revalidatePath("/exams");
}

export async function deleteExamAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id"));
  const marksCount = await prisma.marks.count({ where: { examId: id } });
  if (marksCount > 0) return;
  await prisma.exam.delete({ where: { id } });
  revalidatePath("/exams");
}

export async function generateResultLinkAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id"));
  const exam = await prisma.exam.findUnique({ where: { id } });
  if (!exam) return;

  const resultToken = exam.resultToken || randomBytes(16).toString("hex");

  await prisma.exam.update({
    where: { id },
    data: { resultToken, resultLinkActive: true },
  });
  revalidatePath("/exams");
}

export async function stopResultLinkAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id"));
  await prisma.exam.update({ where: { id }, data: { resultLinkActive: false } });
  revalidatePath("/exams");
}
