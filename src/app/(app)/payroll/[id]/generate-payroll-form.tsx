"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { generatePayrollAction } from "@/app/actions/payroll/payroll";
import { formatCurrency } from "@/lib/utils";
import { AlertCircle, CircleDollarSign } from "lucide-react";

export function GeneratePayrollForm({
  teacherId,
  month,
  year,
  hasStructure,
  hasAttendance,
  monthlySalary,
  outstandingAdvance,
  previousPending,
}: {
  teacherId: string;
  month: number;
  year: number;
  hasStructure: boolean;
  hasAttendance: boolean;
  monthlySalary: number;
  outstandingAdvance: number;
  previousPending: number;
}) {
  const [state, formAction, pending] = useActionState(generatePayrollAction, undefined);
  const canGenerate = hasStructure && hasAttendance;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Salary not yet generated for this period</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!hasStructure && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No active salary structure. <Link href={`/salary-structure/${teacherId}/revise`} className="underline">Assign one first</Link>.
            </AlertDescription>
          </Alert>
        )}
        {!hasAttendance && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No attendance summary for {month}/{year}.{" "}
              <Link href={`/attendance/${teacherId}?month=${month}&year=${year}`} className="underline">Enter attendance first</Link>.
            </AlertDescription>
          </Alert>
        )}

        {canGenerate && (
          <div className="rounded-lg bg-muted px-4 py-3 text-sm">
            <p>Monthly Salary: <span className="font-semibold">{formatCurrency(monthlySalary)}</span></p>
            {outstandingAdvance > 0 && (
              <p>Outstanding Advance to Apply: <span className="font-semibold">{formatCurrency(outstandingAdvance)}</span></p>
            )}
            {previousPending > 0 && (
              <p>Previous Month Pending (carried forward): <span className="font-semibold">{formatCurrency(previousPending)}</span></p>
            )}
            <p className="mt-1 text-xs text-muted-foreground">
              Deductions are computed automatically from the saved attendance summary and current salary settings.
            </p>
          </div>
        )}

        <form action={formAction}>
          <input type="hidden" name="teacherId" value={teacherId} />
          <input type="hidden" name="month" value={month} />
          <input type="hidden" name="year" value={year} />

          {state?.error && (
            <div className="mb-4 rounded-lg bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive">{state.error}</div>
          )}

          <Button type="submit" size="lg" className="w-full" disabled={pending || !canGenerate}>
            <CircleDollarSign /> {pending ? "Generating..." : "Generate Payroll"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
