"use client";

import { useActionState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { updateBusExpenseAction } from "@/app/actions/buses";
import { formatDateInput } from "@/lib/utils";

type ExpenseValues = {
  id: string;
  busId: string;
  amount: number;
  liters: number | null;
  remarks: string | null;
  date: Date | string;
};

export function EditExpenseForm({ expense }: { expense: ExpenseValues }) {
  const [state, formAction, pending] = useActionState(updateBusExpenseAction, undefined);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="id" value={expense.id} />
      <input type="hidden" name="busId" value={expense.busId} />

      <div className="space-y-1.5">
        <Label htmlFor="amount">Diesel/Fuel Amount (₹)</Label>
        <Input
          id="amount"
          name="amount"
          type="number"
          step="0.01"
          min="0.01"
          required
          defaultValue={expense.amount}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="liters">Liters (optional)</Label>
        <Input id="liters" name="liters" type="number" step="0.01" min="0" defaultValue={expense.liters ?? ""} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="date">Date</Label>
        <Input id="date" name="date" type="date" defaultValue={formatDateInput(expense.date)} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="remarks">Remarks (optional)</Label>
        <Input id="remarks" name="remarks" defaultValue={expense.remarks || ""} placeholder="e.g. Full tank, HP Petrol Pump" />
      </div>
      {state?.error && (
        <div className="rounded-lg bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive">
          {state.error}
        </div>
      )}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Saving..." : "Save Changes"}
      </Button>
    </form>
  );
}
