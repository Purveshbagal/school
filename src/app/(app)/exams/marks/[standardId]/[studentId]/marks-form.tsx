"use client";

import { useActionState, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Button } from "@/components/ui/button";
import { saveMarksAction } from "@/app/actions/marks";

type Subject = { id: string; name: string };
type Exam = { id: string; name: string };

function SubjectMarksRow({
  subject,
  initialObtained,
  initialTotal,
  onInvalidChange,
}: {
  subject: Subject;
  initialObtained: number | undefined;
  initialTotal: number | undefined;
  onInvalidChange: (subjectId: string, invalid: boolean) => void;
}) {
  const [obtained, setObtained] = useState(initialObtained != null ? String(initialObtained) : "");
  const [total, setTotal] = useState(initialTotal != null ? String(initialTotal) : "");
  const invalid = obtained !== "" && total !== "" && Number(obtained) > Number(total);

  useEffect(() => {
    onInvalidChange(subject.id, invalid);
    return () => onInvalidChange(subject.id, false);
  }, [invalid, subject.id, onInvalidChange]);

  return (
    <div className="rounded-lg border border-border p-3">
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
            value={obtained}
            aria-invalid={invalid}
            onChange={(e) => setObtained(e.target.value)}
          />
          {invalid && <p className="text-xs text-destructive">Cannot exceed total marks</p>}
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
            value={total}
            onChange={(e) => setTotal(e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}

export function MarksForm({
  studentId,
  standardId,
  aadharNumber,
  subjects,
  exams,
  selectedExamId,
  existingMarks,
  defaultTotalMarks,
}: {
  studentId: string;
  standardId: string;
  aadharNumber: string | null;
  subjects: Subject[];
  exams: Exam[];
  selectedExamId: string;
  existingMarks: Record<string, { marksObtained: number; totalMarks: number }>;
  defaultTotalMarks: Record<string, number>;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(saveMarksAction, undefined);
  const [invalidSubjects, setInvalidSubjects] = useState<Set<string>>(new Set());

  const setSubjectInvalid = useCallback((subjectId: string, invalid: boolean) => {
    setInvalidSubjects((prev) => {
      if (invalid === prev.has(subjectId)) return prev;
      const next = new Set(prev);
      if (invalid) next.add(subjectId);
      else next.delete(subjectId);
      return next;
    });
  }, []);

  const hasInvalid = invalidSubjects.size > 0;

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
          const totalMarksValue = existing?.totalMarks ?? defaultTotalMarks[subject.id];
          // Remount whenever the server-loaded saved values for this subject/exam
          // actually change — e.g. switching the exam dropdown, or right after a
          // save populates previously-empty marks — so each row's local input
          // state resets to the freshly loaded values instead of going stale.
          const rowKey = `${subject.id}-${selectedExamId}-${existing?.marksObtained ?? "x"}-${totalMarksValue ?? "x"}`;
          return (
            <SubjectMarksRow
              key={rowKey}
              subject={subject}
              initialObtained={existing?.marksObtained}
              initialTotal={totalMarksValue}
              onInvalidChange={setSubjectInvalid}
            />
          );
        })}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="aadharNumber">Student Aadhar Number</Label>
        <Input id="aadharNumber" value={aadharNumber || "Not on file"} readOnly disabled />
      </div>

      {hasInvalid && (
        <div className="rounded-lg bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive">
          Marks obtained cannot exceed total marks. Fix the highlighted subject(s) before saving.
        </div>
      )}

      {state?.error && (
        <div className="rounded-lg bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive">
          {state.error}
        </div>
      )}

      <Button type="submit" className="w-full" disabled={pending || hasInvalid}>
        {pending ? "Saving..." : "Save Marks"}
      </Button>
    </form>
  );
}
