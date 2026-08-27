"use client";

import { useActionState, useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { InstallmentSchedulePreview } from "@/components/installment-schedule-preview";
import { updateAdvanceAction } from "@/app/actions/payroll/advance-payments";
import { formatDateInput } from "@/lib/utils";

type AdvanceValues = {
  id: string;
  teacherId: string;
  amount: number;
  emiAmount: number;
  note: string | null;
  date: Date | string;
};

export function EditAdvanceForm({ advance }: { advance: AdvanceValues }) {
  const [state, formAction, pending] = useActionState(updateAdvanceAction, undefined);
  const [amount, setAmount] = useState(advance.amount);
  const [emiAmount, setEmiAmount] = useState(advance.emiAmount);
  const [date, setDate] = useState(formatDateInput(advance.date));

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="id" value={advance.id} />
      <input type="hidden" name="teacherId" value={advance.teacherId} />

      <div className="space-y-1.5">
        <Label htmlFor="amount">Amount (₹)</Label>
        <Input
          id="amount"
          name="amount"
          type="number"
          step="0.01"
          min="0.01"
          required
          value={amount || ""}
          onChange={(e) => setAmount(Number(e.target.value))}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="emiAmount">Deduct per month (₹)</Label>
        <Input
          id="emiAmount"
          name="emiAmount"
          type="number"
          step="0.01"
          min="0.01"
          required
          value={emiAmount || ""}
          onChange={(e) => setEmiAmount(Number(e.target.value))}
        />
        <p className="text-xs text-muted-foreground">Rebuilds the monthly deduction schedule from this amount and the date below.</p>
      </div>
      <InstallmentSchedulePreview amount={amount} emiAmount={emiAmount} date={date} />
      <div className="space-y-1.5">
        <Label htmlFor="date">Date</Label>
        <Input id="date" name="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
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
