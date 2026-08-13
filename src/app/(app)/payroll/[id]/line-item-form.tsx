"use client";

import { useActionState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Button } from "@/components/ui/button";
import { addBonusAction } from "@/app/actions/payroll/bonuses";
import { addDeductionAction } from "@/app/actions/payroll/deductions";

export function LineItemForm({
  kind,
  payrollId,
  types,
}: {
  kind: "bonus" | "deduction";
  payrollId: string;
  types: string[];
}) {
  const action = kind === "bonus" ? addBonusAction : addDeductionAction;
  const [state, formAction, pending] = useActionState(action, undefined);

  return (
    <form action={formAction} className="grid grid-cols-1 gap-2.5 rounded-lg border border-dashed border-border p-3 sm:grid-cols-[1fr_1fr_2fr_auto]">
      <input type="hidden" name="payrollId" value={payrollId} />
      <div className="space-y-1">
        <Label htmlFor={`${kind}-type`} className="text-xs">Type</Label>
        <NativeSelect id={`${kind}-type`} name="type" className="h-9">
          {types.map((t) => (
            <option key={t} value={t}>{t.replace("_", " ")}</option>
          ))}
        </NativeSelect>
      </div>
      <div className="space-y-1">
        <Label htmlFor={`${kind}-amount`} className="text-xs">Amount (₹)</Label>
        <Input id={`${kind}-amount`} name="amount" type="number" step="0.01" min="0.01" required className="h-9" />
      </div>
      <div className="space-y-1">
        <Label htmlFor={`${kind}-note`} className="text-xs">Note</Label>
        <Input id={`${kind}-note`} name="note" className="h-9" />
      </div>
      <div className="flex items-end">
        <Button type="submit" size="sm" disabled={pending} className="w-full sm:w-auto">
          {pending ? "Adding..." : `Add ${kind === "bonus" ? "Bonus" : "Deduction"}`}
        </Button>
      </div>
      {state?.error && (
        <p className="col-span-full text-xs text-destructive">{state.error}</p>
      )}
    </form>
  );
}
