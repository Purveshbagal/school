"use client";

import { useActionState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { updateAdvanceAction } from "@/app/actions/payroll/advance-payments";
import { formatDateInput } from "@/lib/utils";

type AdvanceValues = {
  id: string;
  teacherId: string;
  amount: number;
  note: string | null;
  date: Date | string;
};

export function EditAdvanceForm({ advance }: { advance: AdvanceValues }) {
  const [state, formAction, pending] = useActionState(updateAdvanceAction, undefined);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="id" value={advance.id} />
      <input type="hidden" name="teacherId" value={advance.teacherId} />

      <div className="space-y-1.5">
        <Label htmlFor="amount">Amount (₹)</Label>
        <Input id="amount" name="amount" type="number" step="0.01" min="0.01" required defaultValue={advance.amount} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="date">Date</Label>
        <Input id="date" name="date" type="date" defaultValue={formatDateInput(advance.date)} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="note">Note (optional)</Label>
        <Input id="note" name="note" defaultValue={advance.note || ""} placeholder="e.g. Salary advance" />
      </div>
      {state?.error && (
        <div className="rounded-lg bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive">{state.error}</div>
      )}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Saving..." : "Save Changes"}
      </Button>
    </form>
  );
}
