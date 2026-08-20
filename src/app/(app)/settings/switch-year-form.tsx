"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { switchAcademicYearAction } from "@/app/actions/academic-year";
import { ArrowRightLeft } from "lucide-react";

/** Best-effort guess at the next academic year from strings like "2026-27" or "2026-2027". */
function guessNextYear(current: string): string {
  const match = current.match(/^(\d{4})-(\d{2,4})$/);
  if (!match) return "";
  const startYear = Number(match[1]);
  const suffixDigits = match[2].length;
  const nextStart = startYear + 1;
  const nextSuffix =
    suffixDigits === 4 ? String(nextStart + 1) : String((nextStart + 1) % 100).padStart(2, "0");
  return `${nextStart}-${nextSuffix}`;
}

export function SwitchYearForm({
  currentYear,
  activeStudentCount,
}: {
  currentYear: string;
  activeStudentCount: number;
}) {
  const [state, formAction, pending] = useActionState(switchAcademicYearAction, undefined);
  const [toYear, setToYear] = useState(() => guessNextYear(currentYear));

  return (
    <form
      action={formAction}
      className="space-y-3"
      onSubmit={(e) => {
        const confirmMessage = `Promote all ${activeStudentCount} active student${
          activeStudentCount === 1 ? "" : "s"
        } to their next standard for ${toYear.trim() || "the new year"}? Any pending fees will carry forward. This can only be undone until something else changes.`;
        if (!window.confirm(confirmMessage)) {
          e.preventDefault();
        }
      }}
    >
      <div className="space-y-1.5">
        <Label htmlFor="toYear">New Academic Year</Label>
        <Input
          id="toYear"
          name="toYear"
          value={toYear}
          onChange={(e) => setToYear(e.target.value)}
          placeholder="e.g. 2027-28"
          required
        />
      </div>

      {state?.error && (
        <div className="rounded-lg bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive">
          {state.error}
        </div>
      )}

      <Button type="submit" disabled={pending}>
        <ArrowRightLeft /> {pending ? "Switching..." : "Switch Year"}
      </Button>
    </form>
  );
}
