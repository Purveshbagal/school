"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { saveStudentAttendanceAction } from "@/app/actions/student-attendance";

type Status = "PRESENT" | "ABSENT";
type Student = { id: string; name: string; admissionNo: string };

export function StudentAttendanceForm({
  standardId,
  standardName,
  date,
  students,
  savedStatuses,
}: {
  standardId: string;
  standardName: string;
  date: string;
  students: Student[];
  savedStatuses: Record<string, string>;
}) {
  const [statuses, setStatuses] = useState<Record<string, Status | null>>(
    () => Object.fromEntries(students.map(({ id }) => {
      const saved = savedStatuses[id];
      return [id, saved === "PRESENT" || saved === "ABSENT" ? saved : null];
    }))
  );
  const [state, formAction, pending] = useActionState(saveStudentAttendanceAction, undefined);

  function markAll(status: Status) {
    setStatuses(Object.fromEntries(students.map(({ id }) => [id, status])));
  }

  if (students.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          No active students found in {standardName}.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold">{standardName} · {date}</h2>
            <p className="text-sm text-muted-foreground">{students.length} active students</p>
            <p className="text-xs text-muted-foreground">Choose P for present or A for absent.</p>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => markAll("PRESENT")}>Mark all P</Button>
            <Button type="button" variant="outline" size="sm" onClick={() => markAll("ABSENT")}>Mark all A</Button>
          </div>
        </div>

        <form action={formAction} className="space-y-4">
          <input type="hidden" name="standardId" value={standardId} />
          <input type="hidden" name="date" value={date} />
          <div className="divide-y divide-border rounded-lg border border-border">
            {students.map((student, index) => (
              <div key={student.id} className="flex items-center justify-between gap-3 px-3 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="w-7 shrink-0 text-xs text-muted-foreground">{index + 1}</span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{student.name}</p>
                    <p className="text-xs text-muted-foreground">Admission no. {student.admissionNo}</p>
                  </div>
                </div>
                <input type="hidden" name="studentId" value={student.id} />
                <input type="hidden" name={`attendance_${student.id}`} value={statuses[student.id] ?? ""} />
                <div className="flex shrink-0 gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={statuses[student.id] === "PRESENT" ? "default" : "outline"}
                    aria-pressed={statuses[student.id] === "PRESENT"}
                    aria-label={`Mark ${student.name} present`}
                    onClick={() => setStatuses((previous) => ({ ...previous, [student.id]: "PRESENT" }))}
                  >
                    P
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={statuses[student.id] === "ABSENT" ? "destructive" : "outline"}
                    aria-pressed={statuses[student.id] === "ABSENT"}
                    aria-label={`Mark ${student.name} absent`}
                    onClick={() => setStatuses((previous) => ({ ...previous, [student.id]: "ABSENT" }))}
                  >
                    A
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {state?.error && <p role="alert" className="text-sm text-destructive">{state.error}</p>}
          {state?.success && <p role="status" className="text-sm text-success">Attendance saved successfully.</p>}
          <Button type="submit" className="w-full sm:w-auto" disabled={pending}>
            {pending ? "Saving..." : "Save attendance"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
