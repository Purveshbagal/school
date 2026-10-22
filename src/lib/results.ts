import "server-only";
import { prisma } from "@/lib/db";

export type ExamResult = {
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

/** Shared by the public result lookup, the marks screens and the student app: builds the marks table,
 * totals, and class rank for one student/exam. Returns null if no marks are saved yet. */
export async function computeStudentExamResult(
  student: { id: string; name: string; motherName: string | null; standardId: string; standard: { name: string } },
  exam: { id: string; name: string; resultDate: Date }
): Promise<ExamResult | null> {
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
