"use client";

import { useActionState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Button } from "@/components/ui/button";
import { addAdvanceInstallmentAction } from "@/app/actions/payroll/advance-payments";
import { MONTH_NAMES } from "@/lib/payroll-engine";

export function AddInstallmentForm({
  advancePaymentId,
  teacherId,
  defaultMonth,
  defaultYear,
}: {
  advancePaymentId: string;
  teacherId: string;
  defaultMonth: number;
  defaultYear: number;
}) {
  const [state, formAction, pending] = useActionState(addAdvanceInstallmentAction, undefined);
  const now = new Date();
  const years = Array.from({ length: 6 }, (_, i) => now.getFullYear() - 2 + i);

  return (
    <form action={formAction} className="grid grid-cols-1 gap-2.5 rounded-lg border border-dashed border-border p-3 sm:grid-cols-[1fr_1fr_1fr_auto]">
      <input type="hidden" name="advancePaymentId" value={advancePaymentId} />
      <input type="hidden" name="teacherId" value={teacherId} />
      <div className="space-y-1">
        <Label htmlFor="installment-month" className="text-xs">Month</Label>
        <NativeSelect id="installment-month" name="month" defaultValue={defaultMonth} className="h-9">
          {MONTH_NAMES.map((m, i) => (
            <option key={m} value={i + 1}>{m}</option>
          ))}
        </NativeSelect>
      </div>
      <div className="space-y-1">
        <Label htmlFor="installment-year" className="text-xs">Year</Label>
        <NativeSelect id="installment-year" name="year" defaultValue={defaultYear} className="h-9">
          {years.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </NativeSelect>
      </div>
      <div className="space-y-1">
        <Label htmlFor="installment-amount" className="text-xs">Amount (₹)</Label>
        <Input id="installment-amount" name="amount" type="number" step="0.01" min="0.01" required className="h-9" />
      </div>
      <div className="flex items-end">
        <Button type="submit" size="sm" disabled={pending} className="w-full sm:w-auto">
          {pending ? "Adding..." : "Add Installment"}
        </Button>
      </div>
      {state?.error && <p className="col-span-full text-xs text-destructive">{state.error}</p>}
    </form>
  );
}
