"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NativeSelect } from "@/components/ui/native-select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { PrintDownloadActions } from "@/components/print-download-actions";
import { ResultCard } from "@/app/result/[token]/result-card";
import { getStudentExamResultAction, type ResultLookupResult } from "@/app/actions/marks";

type YearGroup = { year: string; exams: { id: string; name: string }[] };

export function DownloadResultPanel({
  studentId,
  studentName,
  years,
  schoolName,
  address,
  phone,
}: {
  studentId: string;
  studentName: string;
  years: YearGroup[];
  schoolName: string;
  address: string | null;
  phone: string | null;
}) {
  const [year, setYear] = useState(years[0]?.year || "");
  const exams = years.find((y) => y.year === year)?.exams || [];
  const [examId, setExamId] = useState(exams[0]?.id || "");
  const [result, setResult] = useState<ResultLookupResult | null>(null);
  const [pending, startTransition] = useTransition();

  function handleYearChange(nextYear: string) {
    setYear(nextYear);
    const nextExams = years.find((y) => y.year === nextYear)?.exams || [];
    setExamId(nextExams[0]?.id || "");
    setResult(null);
  }

  function handleLoad() {
    if (!examId) return;
    startTransition(async () => {
      const res = await getStudentExamResultAction(studentId, examId);
      setResult(res);
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Download Result</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:items-end">
          <div className="space-y-1.5">
            <Label htmlFor="downloadYear">Academic Year</Label>
            <NativeSelect
              id="downloadYear"
              value={year}
              onChange={(e) => handleYearChange(e.target.value)}
            >
              {years.map((y) => (
                <option key={y.year} value={y.year}>
                  {y.year}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="downloadExam">Exam</Label>
            <NativeSelect id="downloadExam" value={examId} onChange={(e) => setExamId(e.target.value)}>
              {exams.map((exam) => (
                <option key={exam.id} value={exam.id}>
                  {exam.name}
                </option>
              ))}
            </NativeSelect>
          </div>
          <Button onClick={handleLoad} disabled={pending || !examId}>
            {pending ? "Loading..." : "View Result"}
          </Button>
        </div>

        {result && "error" in result && (
          <div className="rounded-lg bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive">
            {result.error}
          </div>
        )}

        {result && !("error" in result) && (
          <div className="space-y-4">
            <PrintDownloadActions targetId="exam-result-card" fileName={`Result-${studentName}-${result.examName}`} />
            <ResultCard
              schoolName={schoolName}
              address={address}
              phone={phone}
              studentName={result.studentName}
              motherName={result.motherName}
              standardName={result.standardName}
              examName={result.examName}
              resultDate={result.resultDate}
              rows={result.rows}
              totalObtained={result.totalObtained}
              totalMax={result.totalMax}
              percentage={result.percentage}
              rank={result.rank}
              totalStudents={result.totalStudents}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
