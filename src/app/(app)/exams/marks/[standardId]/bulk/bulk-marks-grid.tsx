"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { saveBulkMarksAction, type BulkMarksRow } from "@/app/actions/marks";

type Student = { id: string; name: string; admissionNo: string };
type Subject = { id: string; name: string };

export function BulkMarksGrid({
  standardId,
  examId,
  students,
  subjects,
  marksMap,
  defaultTotalMarks,
}: {
  standardId: string;
  examId: string;
  students: Student[];
  subjects: Subject[];
  marksMap: Record<string, { marksObtained: number; totalMarks: number }>;
  defaultTotalMarks: Record<string, number>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);

  const [totals, setTotals] = useState<Record<string, string>>(() =>
    Object.fromEntries(subjects.map((s) => [s.id, defaultTotalMarks[s.id] != null ? String(defaultTotalMarks[s.id]) : ""]))
  );
  const [obtained, setObtained] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const student of students) {
      for (const subject of subjects) {
        const existing = marksMap[`${student.id}_${subject.id}`];
        if (existing) init[`${student.id}_${subject.id}`] = String(existing.marksObtained);
      }
    }
    return init;
  });

  const invalidCells = useMemo(() => {
    const invalid = new Set<string>();
    for (const student of students) {
      for (const subject of subjects) {
        const key = `${student.id}_${subject.id}`;
        const total = Number(totals[subject.id]);
        const value = obtained[key];
        if (value !== undefined && value !== "" && total > 0 && Number(value) > total) {
          invalid.add(key);
        }
      }
    }
    return invalid;
  }, [students, subjects, totals, obtained]);

  function handleSave() {
    setMessage(null);
    const rows: BulkMarksRow[] = [];
    for (const student of students) {
      for (const subject of subjects) {
        const key = `${student.id}_${subject.id}`;
        const value = obtained[key];
        const total = Number(totals[subject.id]) || 0;
        if (value === undefined || value === "" || total <= 0) continue;
        rows.push({
          studentId: student.id,
          subjectId: subject.id,
          marksObtained: Number(value) || 0,
          totalMarks: total,
        });
      }
    }

    startTransition(async () => {
      const res = await saveBulkMarksAction(standardId, examId, rows);
      if (res.error) {
        setMessage({ type: "error", text: res.error });
      } else {
        setMessage({ type: "success", text: "Marks saved." });
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <table className="w-full min-w-max border-collapse text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="sticky left-0 z-10 bg-card px-3 py-2 text-left font-medium">Student Name</th>
              <th className="px-3 py-2 text-left font-medium">Sr. No</th>
              {subjects.map((subject) => (
                <th key={subject.id} className="px-3 py-2 text-center font-medium">
                  {subject.name}
                </th>
              ))}
            </tr>
            <tr className="border-b border-border">
              <th className="sticky left-0 z-10 bg-card px-3 py-1.5 text-left text-xs text-muted-foreground">
                Total Marks
              </th>
              <th className="px-3 py-1.5"></th>
              {subjects.map((subject) => (
                <th key={subject.id} className="px-3 py-1.5">
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    className="h-8 w-20 text-center"
                    value={totals[subject.id] ?? ""}
                    onChange={(e) =>
                      setTotals((prev) => ({ ...prev, [subject.id]: e.target.value }))
                    }
                  />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {students.map((student) => (
              <tr key={student.id} className="border-b border-border last:border-0">
                <td className="sticky left-0 z-10 bg-card px-3 py-2 font-medium">{student.name}</td>
                <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{student.admissionNo}</td>
                {subjects.map((subject) => {
                  const key = `${student.id}_${subject.id}`;
                  const invalid = invalidCells.has(key);
                  return (
                    <td key={subject.id} className="px-3 py-2">
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        aria-invalid={invalid}
                        className="h-8 w-20 text-center"
                        value={obtained[key] ?? ""}
                        onChange={(e) =>
                          setObtained((prev) => ({ ...prev, [key]: e.target.value }))
                        }
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {invalidCells.size > 0 && (
        <div className="rounded-lg bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive">
          Marks obtained cannot exceed total marks. Fix the highlighted cell(s) before saving.
        </div>
      )}

      {message && (
        <div
          className={`rounded-lg px-3.5 py-2.5 text-sm ${
            message.type === "error" ? "bg-destructive/10 text-destructive" : "bg-success/10 text-success"
          }`}
        >
          {message.text}
        </div>
      )}

      <Button onClick={handleSave} disabled={pending || invalidCells.size > 0}>
        {pending ? "Saving..." : "Save All Marks"}
      </Button>
    </div>
  );
}
