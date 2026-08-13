"use client";

import { useActionState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Button } from "@/components/ui/button";
import { reviseSalaryAction } from "@/app/actions/payroll/salary-structure";
import { formatCurrency } from "@/lib/utils";

export function ReviseSalaryForm({
  teacherId,
  currentSalary,
  currentCalculationType,
  today,
}: {
  teacherId: string;
  currentSalary: number;
  currentCalculationType: string;
  today: string;
}) {
  const [state, formAction, pending] = useActionState(reviseSalaryAction, undefined);

  return (
    <Card>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="teacherId" value={teacherId} />

          <div className="rounded-lg bg-muted px-4 py-3 text-sm">
            Current Salary: <span className="font-semibold">{formatCurrency(currentSalary)}</span>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="newSalary">New Monthly Salary (₹)</Label>
            <Input id="newSalary" name="newSalary" type="number" step="0.01" min="0.01" required />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="calculationType">Calculation Type</Label>
            <NativeSelect id="calculationType" name="calculationType" defaultValue={currentCalculationType}>
              <option value="MONTHLY">Monthly</option>
              <option value="PER_DAY">Per Day</option>
              <option value="CUSTOM">Custom</option>
            </NativeSelect>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="effectiveFrom">Effective From</Label>
            <Input id="effectiveFrom" name="effectiveFrom" type="date" defaultValue={today} required />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="reason">Reason (optional)</Label>
            <Input id="reason" name="reason" placeholder="e.g. Annual increment" />
          </div>

          {state?.error && (
            <div className="rounded-lg bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive">{state.error}</div>
          )}

          <Button type="submit" size="lg" className="w-full" disabled={pending}>
            {pending ? "Saving..." : "Save Revision"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
