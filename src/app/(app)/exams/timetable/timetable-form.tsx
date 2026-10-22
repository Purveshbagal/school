"use client";

import { useActionState, useState } from "react";
import { CheckCircle2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { createExamScheduleAction } from "@/app/actions/exam-schedules";

/** The day after `day` (YYYY-MM-DD), skipping Sunday — the usual next paper day. */
function nextExamDay(day: string): string {
  const d = new Date(`${day}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return day;
  do d.setUTCDate(d.getUTCDate() + 1);
  while (d.getUTCDay() === 0);
  return d.toISOString().slice(0, 10);
}

export function TimetableForm({
  standardId,
  exams,
  subjects,
  defaultExamId,
}: {
  standardId: string;
  exams: { id: string; label: string }[];
  subjects: string[];
  defaultExamId: string;
}) {
  const [state, formAction, pending] = useActionState(createExamScheduleAction, undefined);
  const [examId, setExamId] = useState(defaultExamId);
  const [subject, setSubject] = useState("");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("10:00");
  const [endTime, setEndTime] = useState("13:00");

  // After a paper is added keep the exam and timing, and move on to the next day.
  const [handledOk, setHandledOk] = useState<number | undefined>();
  if (state?.ok && state.ok !== handledOk) {
    setHandledOk(state.ok);
    setSubject("");
    if (date) setDate(nextExamDay(date));
  }

  if (exams.length === 0) {
    return <p className="text-sm text-muted-foreground">Add an exam in Set Exam first, then build its timetable here.</p>;
  }

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="standardId" value={standardId} />
      <div className="space-y-1.5">
        <Label htmlFor="examId">Exam *</Label>
        <NativeSelect id="examId" name="examId" required value={examId} onChange={(e) => setExamId(e.target.value)}>
          {exams.map((e) => (
            <option key={e.id} value={e.id}>
              {e.label}
            </option>
          ))}
        </NativeSelect>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="subject">Subject</Label>
        <Input
          id="subject"
          name="subject"
          list="timetable-subjects"
          maxLength={100}
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="e.g. Marathi (leave blank for a whole-day exam)"
        />
        <datalist id="timetable-subjects">
          {subjects.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="date">Date *</Label>
        <Input id="date" name="date" type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="startTime">From</Label>
          <Input id="startTime" name="startTime" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="endTime">To</Label>
          <Input id="endTime" name="endTime" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
        </div>
      </div>

      {state?.error && (
        <div className="rounded-lg bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive">{state.error}</div>
      )}
      {state?.ok && !pending && !state.error && (
        <div className="flex items-center gap-2 rounded-lg bg-success/10 px-3.5 py-2.5 text-sm text-success">
          <CheckCircle2 className="h-4 w-4" /> Added. Students of this standard see it under Upcoming Exams.
        </div>
      )}

      <Button type="submit" className="w-full" disabled={pending}>
        <Plus /> {pending ? "Adding..." : "Add to Timetable"}
      </Button>
    </form>
  );
}
