"use client";

import { useActionState, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { saveAttendanceSummaryAction } from "@/app/actions/payroll/attendance-summary";
import { calcPresentDays, calcAbsentDays } from "@/lib/payroll-engine";
import { Lock } from "lucide-react";

export function AttendanceForm({
  teacherId,
  month,
  year,
  locked,
  defaultWorkingDays,
  defaultAbsentDays,
  defaultHalfDays,
  defaultPaidLeaveDays,
  defaultUnpaidLeaveDays,
  defaultLateCount,
}: {
  teacherId: string;
  month: number;
  year: number;
  locked: boolean;
  defaultWorkingDays: number;
  defaultAbsentDays: number;
  defaultHalfDays: number;
  defaultPaidLeaveDays: number;
  defaultUnpaidLeaveDays: number;
  defaultLateCount: number;
}) {
  const [state, formAction, pending] = useActionState(saveAttendanceSummaryAction, undefined);

  const [workingDays, setWorkingDays] = useState(defaultWorkingDays);
  const [absentDays, setAbsentDaysState] = useState(defaultAbsentDays);
  const [halfDays, setHalfDaysState] = useState(defaultHalfDays);
  const [paidLeaveDays, setPaidLeaveDaysState] = useState(defaultPaidLeaveDays);
  const [unpaidLeaveDays, setUnpaidLeaveDaysState] = useState(defaultUnpaidLeaveDays);
  const [lateCount, setLateCount] = useState(defaultLateCount);

  const [presentDays, setPresentDaysState] = useState(
    calcPresentDays({
      workingDays: defaultWorkingDays,
      absentDays: defaultAbsentDays,
      halfDays: defaultHalfDays,
      paidLeaveDays: defaultPaidLeaveDays,
      unpaidLeaveDays: defaultUnpaidLeaveDays,
    })
  );
  const [driver, setDriver] = useState<"absent" | "present">("absent");

  function recompute(next: {
    workingDays?: number;
    absentDays?: number;
    halfDays?: number;
    paidLeaveDays?: number;
    unpaidLeaveDays?: number;
    presentDays?: number;
    driver?: "absent" | "present";
  }) {
    const w = next.workingDays ?? workingDays;
    const h = next.halfDays ?? halfDays;
    const pl = next.paidLeaveDays ?? paidLeaveDays;
    const ul = next.unpaidLeaveDays ?? unpaidLeaveDays;
    const d = next.driver ?? driver;

    if (d === "absent") {
      const a = next.absentDays ?? absentDays;
      setPresentDaysState(calcPresentDays({ workingDays: w, absentDays: a, halfDays: h, paidLeaveDays: pl, unpaidLeaveDays: ul }));
    } else {
      const p = next.presentDays ?? presentDays;
      setAbsentDaysState(calcAbsentDays({ workingDays: w, presentDays: p, halfDays: h, paidLeaveDays: pl, unpaidLeaveDays: ul }));
    }
  }

  function handleWorkingDays(v: number) { setWorkingDays(v); recompute({ workingDays: v }); }
  function handleAbsentDays(v: number) { setDriver("absent"); setAbsentDaysState(v); recompute({ absentDays: v, driver: "absent" }); }
  function handleHalfDays(v: number) { setHalfDaysState(v); recompute({ halfDays: v }); }
  function handlePaidLeaveDays(v: number) { setPaidLeaveDaysState(v); recompute({ paidLeaveDays: v }); }
  function handleUnpaidLeaveDays(v: number) { setUnpaidLeaveDaysState(v); recompute({ unpaidLeaveDays: v }); }
  function handlePresentDays(v: number) { setDriver("present"); setPresentDaysState(v); recompute({ presentDays: v, driver: "present" }); }

  return (
    <Card>
      <CardContent>
        {locked && (
          <Alert className="mb-4">
            <Lock className="h-4 w-4" />
            <AlertDescription>
              Payroll for this month is locked. Unlock it (admin only) before editing attendance.
            </AlertDescription>
          </Alert>
        )}

        <form action={formAction} className="space-y-6">
          <input type="hidden" name="teacherId" value={teacherId} />
          <input type="hidden" name="month" value={month} />
          <input type="hidden" name="year" value={year} />
          <input type="hidden" name="absentDays" value={absentDays} />

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <Field label="Working Days" name="workingDays" value={workingDays} onChange={handleWorkingDays} disabled={locked} />
            <Field label="Present Days" value={presentDays} onChange={handlePresentDays} highlight={driver === "present"} disabled={locked} />
            <Field label="Absent Days" value={absentDays} onChange={handleAbsentDays} highlight={driver === "absent"} disabled={locked} />
            <Field label="Half Day" name="halfDays" value={halfDays} onChange={handleHalfDays} disabled={locked} />
            <Field label="Paid Leave" name="paidLeaveDays" value={paidLeaveDays} onChange={handlePaidLeaveDays} disabled={locked} />
            <Field label="Unpaid Leave" name="unpaidLeaveDays" value={unpaidLeaveDays} onChange={handleUnpaidLeaveDays} disabled={locked} />
            <Field label="Late Count" name="lateCount" value={lateCount} onChange={setLateCount} disabled={locked} />
          </div>

          <p className="text-xs text-muted-foreground">
            Fill either Present Days or Absent Days — the other updates automatically. Paid Leave is not deducted from salary; Unpaid Leave and Absent are.
          </p>

          {state?.error && (
            <div className="rounded-lg bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive">{state.error}</div>
          )}

          <Button type="submit" size="lg" className="w-full" disabled={pending || locked}>
            {pending ? "Saving..." : "Save Attendance Summary"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function Field({
  label,
  name,
  value,
  onChange,
  highlight = false,
  disabled = false,
}: {
  label: string;
  name?: string;
  value: number;
  onChange: (v: number) => void;
  highlight?: boolean;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={name}>{label}</Label>
      <Input
        id={name}
        name={name}
        type="number"
        step="0.5"
        min={0}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        className={highlight ? "border-primary/50 ring-1 ring-primary/20" : undefined}
      />
    </div>
  );
}
