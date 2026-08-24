import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { BulkExamPicker } from "./bulk-exam-picker";
import { BulkMarksGrid } from "./bulk-marks-grid";

export default async function BulkMarksPage({
  params,
  searchParams,
}: {
  params: Promise<{ standardId: string }>;
  searchParams: Promise<{ examId?: string }>;
}) {
  const { standardId } = await params;
  const { examId: selectedExamId } = await searchParams;

  const standard = await prisma.standard.findUnique({ where: { id: standardId } });
  if (!standard) notFound();

  const [students, subjects, exams] = await Promise.all([
    prisma.student.findMany({
      where: { standardId, status: "ACTIVE" },
      orderBy: { name: "asc" },
    }),
    prisma.subject.findMany({ where: { standardId }, orderBy: { name: "asc" } }),
    prisma.exam.findMany({ where: { NOT: { isFinal: true } }, orderBy: { examDate: "desc" } }),
  ]);

  const examId = selectedExamId || exams[0]?.id || "";

  const existingMarks = examId
    ? await prisma.marks.findMany({
        where: { examId, subject: { standardId } },
      })
    : [];

  const marksMap: Record<string, { marksObtained: number; totalMarks: number }> = {};
  const defaultTotalMarksBySubjectId: Record<string, number> = {};
  for (const m of existingMarks) {
    marksMap[`${m.studentId}_${m.subjectId}`] = {
      marksObtained: m.marksObtained,
      totalMarks: m.totalMarks,
    };
    if (!(m.subjectId in defaultTotalMarksBySubjectId)) {
      defaultTotalMarksBySubjectId[m.subjectId] = m.totalMarks;
    }
  }

  return (
    <div>
      <PageHeader
        title={`Bulk Fill Marks — ${standard.name}`}
        description={`${students.length} active student${students.length === 1 ? "" : "s"} · ${subjects.length} subject${subjects.length === 1 ? "" : "s"}`}
      />

      <div className="mb-4 flex items-center justify-between gap-3">
        <Button variant="outline" size="sm" render={
          <Link href={`/exams/marks/${standardId}`}>
            <ArrowLeft /> Back to Students
          </Link>
        } />
        <BulkExamPicker exams={exams} selectedExamId={examId} />
      </div>

      <Card>
        <CardContent>
          {subjects.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No subjects added for {standard.name} yet. Add subjects first.
            </p>
          ) : exams.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No exams created yet. Create one from Set Exam first.
            </p>
          ) : students.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No active students found in {standard.name}.
            </p>
          ) : (
            <BulkMarksGrid
              key={examId}
              standardId={standardId}
              examId={examId}
              students={students.map((s) => ({ id: s.id, name: s.name, admissionNo: s.admissionNo }))}
              subjects={subjects.map((s) => ({ id: s.id, name: s.name }))}
              marksMap={marksMap}
              defaultTotalMarks={defaultTotalMarksBySubjectId}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
