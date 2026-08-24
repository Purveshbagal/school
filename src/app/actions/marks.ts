"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getExamFeeGateThreshold, checkFeePaymentGate } from "@/lib/fees";

/** Runs async tasks with limited concurrency, so a large bulk save doesn't fire hundreds
 * of simultaneous writes at once and exhaust the database connection pool. */
async function runWithConcurrency<T>(items: T[], limit: number, task: (item: T) => Promise<unknown>) {
  let index = 0;
  async function worker() {
    while (index < items.length) {
      const item = items[index++];
      await task(item);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
}

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

export type BulkMarksRow = {
  studentId: string;
  subjectId: string;
  marksObtained: number;
  totalMarks: number;
};

export async function saveBulkMarksAction(
  standardId: string,
  examId: string,
  rows: BulkMarksRow[]
): Promise<{ error?: string }> {
  if (!standardId || !examId) return { error: "Please select a term/exam" };

  const validRows = rows.filter((r) => r.totalMarks > 0);
  if (validRows.length === 0) return { error: "Enter marks for at least one student/subject" };

  const overLimit = validRows.filter((r) => r.marksObtained > r.totalMarks);
  if (overLimit.length > 0) {
    return { error: "Marks obtained cannot exceed total marks for one or more entries" };
  }

  await runWithConcurrency(validRows, 10, (r) =>
    prisma.marks.upsert({
      where: {
        studentId_examId_subjectId: { studentId: r.studentId, examId, subjectId: r.subjectId },
      },
      create: {
        studentId: r.studentId,
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
  );

  revalidatePath(`/exams/marks/${standardId}/bulk`);
  return {};
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

/** Shared by lookupResultAction and getStudentExamResultAction: builds the marks table,
 * totals, and class rank for one student/exam. Returns null if no marks are saved yet. */
async function computeStudentExamResult(
  student: { id: string; name: string; motherName: string | null; standardId: string; standard: { name: string } },
  exam: { id: string; name: string; resultDate: Date }
): Promise<Omit<Extract<ResultLookupResult, { rank: number }>, "error"> | null> {
  const marks = await prisma.marks.findMany({
    where: { studentId: student.id, examId: exam.id },
    include: { subject: true },
  });
  if (marks.length === 0) return null;

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

  const gateThreshold = getExamFeeGateThreshold(exam.name);
  if (gateThreshold !== null) {
    const { passed, paidPct } = await checkFeePaymentGate(student.id, gateThreshold);
    if (!passed) {
      return {
        error: `Fees have not been paid. Please pay at least ${Math.round(gateThreshold * 100)}% of the total fees to view this result (${Math.round(paidPct * 100)}% paid so far).`,
      };
    }
  }

  const result = await computeStudentExamResult(student, exam);
  if (!result) {
    return { error: "Result not available for this student yet." };
  }

  return result;
}

/** Teacher-facing equivalent of lookupResultAction — same result shape, but looked up
 * directly by studentId/examId (no Aadhar number, no result-link token, no fee gate)
 * since this is used from the authenticated marks-entry screens, not the public link. */
export async function getStudentExamResultAction(
  studentId: string,
  examId: string
): Promise<ResultLookupResult> {
  const [student, exam] = await Promise.all([
    prisma.student.findUnique({ where: { id: studentId }, include: { standard: true } }),
    prisma.exam.findUnique({ where: { id: examId } }),
  ]);
  if (!student) return { error: "Student not found." };
  if (!exam) return { error: "Exam not found." };

  const result = await computeStudentExamResult(student, exam);
  if (!result) {
    return { error: "No marks saved yet for this exam." };
  }

  return result;
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

  const { passed, paidPct } = await checkFeePaymentGate(student.id, 0.95);
  if (!passed) {
    return {
      error: `Fees have not been paid. Please pay at least 95% of the total fees to view this result (${Math.round(paidPct * 100)}% paid so far).`,
    };
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
