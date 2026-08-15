"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Button } from "@/components/ui/button";
import { saveMarksAction } from "@/app/actions/marks";

type Subject = { id: string; name: string };
type Exam = { id: string; name: string };

export function MarksForm({
  studentId,
  standardId,
  aadharNumber,
  subjects,
  exams,
  selectedExamId,
  existingMarks,
}: {
  studentId: string;
  standardId: string;
  aadharNumber: string | null;
  subjects: Subject[];
  exams: Exam[];
  selectedExamId: string;
  existingMarks: Record<string, { marksObtained: number; totalMarks: number }>;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(saveMarksAction, undefined);

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="studentId" value={studentId} />
      <input type="hidden" name="standardId" value={standardId} />

      <div className="space-y-1.5">
        <Label htmlFor="examId">Term / Exam</Label>
        <NativeSelect
          id="examId"
          name="examId"
          value={selectedExamId}
          onChange={(e) => router.push(`?examId=${e.target.value}`)}
        >
          {exams.map((exam) => (
            <option key={exam.id} value={exam.id}>
              {exam.name}
            </option>
          ))}
        </NativeSelect>
      </div>

      <div className="space-y-3">
        {subjects.map((subject) => {
          const existing = existingMarks[subject.id];
          // Remount (not just re-render) whenever the server-loaded saved values
          // for this subject/exam actually change — e.g. switching the exam
          // dropdown, or right after a save populates previously-empty marks.
          // Otherwise Base UI's uncontrolled Input warns about defaultValue
          // changing after the initial mount.
          const rowKey = `${subject.id}-${selectedExamId}-${existing?.marksObtained ?? "x"}-${existing?.totalMarks ?? "x"}`;
          return (
            <div key={rowKey} className="rounded-lg border border-border p-3">
              <input type="hidden" name="subjectId" value={subject.id} />
              <p className="mb-2 text-sm font-medium">{subject.name}</p>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label htmlFor={`marksObtained-${subject.id}`} className="text-xs text-muted-foreground">
                    Marks Obtained
                  </Label>
                  <Input
                    id={`marksObtained-${subject.id}`}
                    name="marksObtained"
                    type="number"
                    step="0.01"
                    min="0"
                    defaultValue={existing?.marksObtained}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor={`totalMarks-${subject.id}`} className="text-xs text-muted-foreground">
                    Total Marks
                  </Label>
                  <Input
                    id={`totalMarks-${subject.id}`}
                    name="totalMarks"
                    type="number"
                    step="0.01"
                    min="0"
                    defaultValue={existing?.totalMarks}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="aadharNumber">Student Aadhar Number</Label>
        <Input id="aadharNumber" value={aadharNumber || "Not on file"} readOnly disabled />
      </div>

      {state?.error && (
        <div className="rounded-lg bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive">
          {state.error}
        </div>
      )}

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Saving..." : "Save Marks"}
      </Button>
    </form>
  );
}
