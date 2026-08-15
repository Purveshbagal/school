"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";

export async function saveMarksAction(
  _prevState: { error?: string } | undefined,
  formData: FormData
): Promise<{ error?: string } | never> {
  const studentId = String(formData.get("studentId") || "");
  const standardId = String(formData.get("standardId") || "");
  const examId = String(formData.get("examId") || "");

  if (!studentId || !examId) {
    return { error: "Please select a term/exam" };
  }

  const subjectIds = formData.getAll("subjectId").map(String);
  const marksObtained = formData.getAll("marksObtained").map(Number);
  const totalMarks = formData.getAll("totalMarks").map(Number);

  const rows = subjectIds
    .map((subjectId, i) => ({
      subjectId,
      marksObtained: marksObtained[i] || 0,
      totalMarks: totalMarks[i] || 0,
    }))
    .filter((r) => r.totalMarks > 0);

  if (rows.length === 0) {
    return { error: "Enter marks for at least one subject" };
  }

  await Promise.all(
    rows.map((r) =>
      prisma.marks.upsert({
        where: { studentId_examId_subjectId: { studentId, examId, subjectId: r.subjectId } },
        create: {
          studentId,
          examId,
          subjectId: r.subjectId,
          marksObtained: r.marksObtained,
          totalMarks: r.totalMarks,
        },
        update: {
          marksObtained: r.marksObtained,
          totalMarks: r.totalMarks,
        },
      })
    )
  );

  revalidatePath(`/exams/marks/${standardId}/${studentId}`);
  redirect(`/exams/marks/${standardId}/${studentId}?examId=${examId}`);
}

export type ResultLookupResult =
  | { error: string }
  | {
      studentName: string;
      standardName: string;
      examName: string;
      rows: { subjectName: string; marksObtained: number; totalMarks: number }[];
      totalObtained: number;
      totalMax: number;
      percentage: number;
    };

export async function lookupResultAction(
  token: string,
  aadharNumber: string
): Promise<ResultLookupResult> {
  const aadhar = aadharNumber.trim();
  if (!aadhar) return { error: "Please enter the Aadhar card number" };

  const exam = await prisma.exam.findUnique({ where: { resultToken: token } });
  if (!exam || !exam.resultLinkActive) {
    return { error: "This result link is no longer available." };
  }

  const student = await prisma.student.findFirst({
    where: { aadharNumber: aadhar },
    include: { standard: true },
  });
  if (!student) {
    return { error: "No student found with this Aadhar card number." };
  }

  const marks = await prisma.marks.findMany({
    where: { studentId: student.id, examId: exam.id },
    include: { subject: true },
  });

  if (marks.length === 0) {
    return { error: "Result not available for this student yet." };
  }

  const rows = marks.map((m) => ({
    subjectName: m.subject.name,
    marksObtained: m.marksObtained,
    totalMarks: m.totalMarks,
  }));
  const totalObtained = rows.reduce((sum, r) => sum + r.marksObtained, 0);
  const totalMax = rows.reduce((sum, r) => sum + r.totalMarks, 0);
  const percentage = totalMax > 0 ? (totalObtained / totalMax) * 100 : 0;

  return {
    studentName: student.name,
    standardName: student.standard.name,
    examName: exam.name,
    rows,
    totalObtained,
    totalMax,
    percentage,
  };
}
