import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MarksSummaryTable } from "@/components/marks-summary-table";
import { MarksForm } from "./marks-form";

export default async function StudentMarksEntryPage({
  params,
  searchParams,
}: {
  params: Promise<{ standardId: string; studentId: string }>;
  searchParams: Promise<{ examId?: string }>;
}) {
  const { standardId, studentId } = await params;
  const { examId: selectedExamId } = await searchParams;

  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: { standard: true },
  });
  if (!student || student.standardId !== standardId) notFound();

  const [subjects, exams] = await Promise.all([
    prisma.subject.findMany({ where: { standardId }, orderBy: { name: "asc" } }),
    prisma.exam.findMany({ orderBy: { examDate: "desc" } }),
  ]);

  const examId = selectedExamId || exams[0]?.id || "";

  const existingMarks = examId
    ? await prisma.marks.findMany({
        where: { studentId, examId },
        include: { subject: true },
      })
    : [];
  const marksBySubjectId = new Map(existingMarks.map((m) => [m.subjectId, m]));

  const summaryRows = existingMarks.map((m) => ({
    subjectName: m.subject.name,
    marksObtained: m.marksObtained,
    totalMarks: m.totalMarks,
  }));
  const totalObtained = summaryRows.reduce((sum, r) => sum + r.marksObtained, 0);
  const totalMax = summaryRows.reduce((sum, r) => sum + r.totalMarks, 0);
  const percentage = totalMax > 0 ? (totalObtained / totalMax) * 100 : 0;

  return (
    <div>
      <PageHeader
        title={`Marks — ${student.name}`}
        description={`${student.standard.name} · Admission No. ${student.admissionNo}`}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Enter Marks</CardTitle>
          </CardHeader>
          <CardContent>
            {subjects.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No subjects added for {student.standard.name} yet. Add subjects first.
              </p>
            ) : exams.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No exams created yet. Create one from Set Exam first.
              </p>
            ) : (
              <MarksForm
                studentId={studentId}
                standardId={standardId}
                aadharNumber={student.aadharNumber}
                subjects={subjects}
                exams={exams}
                selectedExamId={examId}
                existingMarks={Object.fromEntries(
                  [...marksBySubjectId.entries()].map(([subjectId, m]) => [
                    subjectId,
                    { marksObtained: m.marksObtained, totalMarks: m.totalMarks },
                  ])
                )}
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Result Summary</CardTitle>
          </CardHeader>
          <CardContent>
            {summaryRows.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No marks saved yet for the selected term.
              </p>
            ) : (
              <MarksSummaryTable
                rows={summaryRows}
                totalObtained={totalObtained}
                totalMax={totalMax}
                percentage={percentage}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
