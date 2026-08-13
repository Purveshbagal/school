"use client";

import { useActionState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Button } from "@/components/ui/button";
import { addAdvanceAction } from "@/app/actions/payroll/advance-payments";

type Teacher = { id: string; name: string; designation: string | null };

export function SendAdvanceForm({ teachers, today }: { teachers: Teacher[]; today: string }) {
  const [state, formAction, pending] = useActionState(addAdvanceAction, undefined);

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="teacherId">Staff Member *</Label>
        <NativeSelect id="teacherId" name="teacherId" required defaultValue="">
          <option value="">Select a staff member</option>
          {teachers.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
              {t.designation ? ` — ${t.designation}` : ""}
            </option>
          ))}
        </NativeSelect>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="amount">Amount (₹) *</Label>
        <Input id="amount" name="amount" type="number" step="0.01" min="0.01" required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="date">Date</Label>
        <Input id="date" name="date" type="date" defaultValue={today} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="note">Note (optional)</Label>
        <Input id="note" name="note" placeholder="e.g. Salary advance, Book & dress advance" />
      </div>
      {state?.error && (
        <div className="rounded-lg bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive">{state.error}</div>
      )}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Sending..." : "Give Advance"}
      </Button>
    </form>
  );
}
