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

  const overLimit = rows.filter((r) => r.marksObtained > r.totalMarks);
  if (overLimit.length > 0) {
    const subjects = await prisma.subject.findMany({
      where: { id: { in: overLimit.map((r) => r.subjectId) } },
      select: { name: true },
    });
    return {
      error: `Marks obtained cannot exceed total marks (${subjects.map((s) => s.name).join(", ")})`,
    };
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

  // Keep totalMarks in sync across the rest of the standard for this exam:
  // a paper's total is the same for every student, so once one student's
  // entry sets/changes it, carry it over to classmates who already have a
  // marks row for the same subject/exam (new entries pick it up via the
  // defaultTotalMarks prefill on the entry page instead).
  await Promise.all(
    rows.map((r) =>
      prisma.marks.updateMany({
        where: {
          examId,
          subjectId: r.subjectId,
          studentId: { not: studentId },
          student: { standardId },
        },
        data: { totalMarks: r.totalMarks },
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
      motherName: string | null;
      standardName: string;
      examName: string;
      resultDate: Date;
      rows: { subjectName: string; marksObtained: number; totalMarks: number }[];
      totalObtained: number;
      totalMax: number;
      percentage: number;
      rank: number;
      totalStudents: number;
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

  // Rank the student against classmates (same standard) who also have marks for this exam.
  const classmateIds = (
    await prisma.student.findMany({ where: { standardId: student.standardId }, select: { id: true } })
  ).map((s) => s.id);
  const classmateMarks = await prisma.marks.findMany({
    where: { examId: exam.id, studentId: { in: classmateIds } },
    select: { studentId: true, marksObtained: true },
  });
  const totalsByStudent = new Map<string, number>();
  for (const m of classmateMarks) {
    totalsByStudent.set(m.studentId, (totalsByStudent.get(m.studentId) || 0) + m.marksObtained);
  }
  const sortedTotals = Array.from(totalsByStudent.values()).sort((a, b) => b - a);
  const rank = sortedTotals.indexOf(totalObtained) + 1;
  const totalStudents = sortedTotals.length;

  return {
    studentName: student.name,
    motherName: student.motherName,
    standardName: student.standard.name,
    examName: exam.name,
    resultDate: exam.resultDate,
    rows,
    totalObtained,
    totalMax,
    rank,
    totalStudents,
    percentage,
  };
}

export type FinalResultLookupResult =
  | { error: string }
  | {
      studentName: string;
      motherName: string | null;
      standardName: string;
      terms: { examName: string; examDate: Date; totalObtained: number; totalMax: number; percentage: number }[];
      totalObtained: number;
      totalMax: number;
      percentage: number;
    };

export async function lookupFinalResultAction(
  token: string,
  aadharNumber: string
): Promise<FinalResultLookupResult> {
  const aadhar = aadharNumber.trim();
  if (!aadhar) return { error: "Please enter the Aadhar card number" };

  const finalExam = await prisma.exam.findUnique({ where: { resultToken: token } });
  if (!finalExam || !finalExam.isFinal || !finalExam.resultLinkActive) {
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
    where: { studentId: student.id, exam: { NOT: { isFinal: true } } },
    include: { exam: true },
  });

  if (marks.length === 0) {
    return { error: "Result not available for this student yet." };
  }

  const byExam = new Map<string, { examName: string; examDate: Date; totalObtained: number; totalMax: number }>();
  for (const m of marks) {
    const entry = byExam.get(m.examId) || { examName: m.exam.name, examDate: m.exam.examDate, totalObtained: 0, totalMax: 0 };
    entry.totalObtained += m.marksObtained;
    entry.totalMax += m.totalMarks;
    byExam.set(m.examId, entry);
  }

  const terms = Array.from(byExam.values())
    .sort((a, b) => a.examDate.getTime() - b.examDate.getTime())
    .map((t) => ({ ...t, percentage: t.totalMax > 0 ? (t.totalObtained / t.totalMax) * 100 : 0 }));

  const totalObtained = terms.reduce((sum, t) => sum + t.totalObtained, 0);
  const totalMax = terms.reduce((sum, t) => sum + t.totalMax, 0);
  const percentage = totalMax > 0 ? (totalObtained / totalMax) * 100 : 0;

  return {
    studentName: student.name,
    motherName: student.motherName,
    standardName: student.standard.name,
    terms,
    totalObtained,
    totalMax,
    percentage,
  };
}
