"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { generatePayrollAction } from "@/app/actions/payroll/payroll";
import { formatCurrency } from "@/lib/utils";
import { AlertCircle, CheckCircle2, CircleDollarSign } from "lucide-react";

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
  const router = useRouter();
  const [state, formAction, pending] = useActionState(generatePayrollAction, undefined);
  const [showDone, setShowDone] = useState(false);
  const canGenerate = hasStructure && hasAttendance;

  useEffect(() => {
    if (state?.success) {
      setShowDone(true);
    }
  }, [state]);

  function handleDoneClose(open: boolean) {
    setShowDone(open);
    if (!open) router.refresh();
  }

  return (
    <Card>
      <Dialog open={showDone} onOpenChange={handleDoneClose}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-success" /> Done
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Payroll generated successfully.</p>
          <DialogFooter>
            <Button onClick={() => handleDoneClose(false)}>OK</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
