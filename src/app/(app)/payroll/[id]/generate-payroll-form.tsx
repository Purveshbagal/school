"use client";

import Link from "next/link";
import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { generatePayrollAction } from "@/app/actions/payroll/payroll";
import { formatCurrency } from "@/lib/utils";
import { PayrollRow, PayrollLine } from "@/components/payroll-breakdown";
import type { getPayrollPreview } from "@/lib/payroll-data";
import { AlertCircle, CircleDollarSign } from "lucide-react";

type Preview = Awaited<ReturnType<typeof getPayrollPreview>>;

export function GeneratePayrollForm({
  teacherId,
  month,
  year,
  preview,
  outstandingAdvance,
}: {
  teacherId: string;
  month: number;
  year: number;
  preview: Preview;
  outstandingAdvance: number;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(generatePayrollAction, undefined);

  useEffect(() => {
    if (state?.success) router.refresh();
  }, [state?.success, router]);

  if (!preview.ok) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Salary not yet generated for this period</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!preview.hasStructure && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No active salary structure. <Link href={`/salary-structure/${teacherId}/revise`} className="underline">Assign one first</Link>.
              </AlertDescription>
            </Alert>
          )}
          {!preview.hasAttendance && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No attendance summary for {month}/{year}.{" "}
                <Link href={`/attendance/${teacherId}?month=${month}&year=${year}`} className="underline">Enter attendance first</Link>.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    );
  }

  const { result } = preview;

  return (
    <Card className="border-t-2 border-t-primary">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <CircleDollarSign className="h-4 w-4" /> Preview
        </CardTitle>
        <Badge variant="outline">Not yet generated</Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-3">
          <PayrollRow label="Working Days" value={preview.workingDays} />
          <PayrollRow label="Present Days" value={preview.presentDays} />
          <PayrollRow label="Absent Days" value={preview.absentDays} />
          <PayrollRow label="Half Days" value={preview.halfDays} />
          <PayrollRow label="Paid Leave" value={preview.paidLeaveDays} />
          <PayrollRow label="Unpaid Leave" value={preview.unpaidLeaveDays} />
        </dl>

        <div className="space-y-2 border-t border-border pt-4 text-sm">
          <PayrollLine label="Gross Salary" value={result.grossSalary} />
          <PayrollLine label="Leave Deduction" value={-result.leaveDeduction} />
          <PayrollLine label="Half Day Deduction" value={-result.halfDayDeduction} />
          <PayrollLine label="Late Deduction" value={-result.lateDeduction} />
          <PayrollLine label="Other Deductions" value={-result.otherDeductionsTotal} />
          <PayrollLine label="Advance Applied" value={-preview.advanceApplied} />
          <PayrollLine label="Previous Pending" value={preview.previousPending} />
          <div className="flex items-center justify-between border-t border-border pt-2 font-semibold">
            <span>Net Payable</span>
            <span>{formatCurrency(result.netPayable)}</span>
          </div>
        </div>

        {outstandingAdvance > 0 && (
          <p className="text-xs text-muted-foreground">
            Outstanding advance on file: <span className="font-medium">{formatCurrency(outstandingAdvance)}</span>
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          This is a live preview computed from the saved attendance summary and current salary settings — nothing is saved yet.
        </p>

        <form action={formAction}>
          <input type="hidden" name="teacherId" value={teacherId} />
          <input type="hidden" name="month" value={month} />
          <input type="hidden" name="year" value={year} />

          {state?.error && (
            <div className="mb-4 rounded-lg bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive">{state.error}</div>
          )}

          <Button type="submit" size="lg" className="w-full" disabled={pending}>
            <CircleDollarSign /> {pending ? "Generating..." : "Confirm & Generate Payroll"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
