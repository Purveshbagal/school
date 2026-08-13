"use client";

import { useActionState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Button } from "@/components/ui/button";
import { paySalaryAction } from "@/app/actions/payroll/salary-payments";
import { formatCurrency } from "@/lib/utils";
import { Wallet } from "lucide-react";

export function PaySalaryForm({
  payrollId,
  pendingAmount,
  today,
}: {
  payrollId: string;
  pendingAmount: number;
  today: string;
}) {
  const [state, formAction, pending] = useActionState(paySalaryAction, undefined);

  return (
    <Card className="border-t-2 border-t-success">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wallet className="h-4 w-4" /> Pay Salary
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-3 text-sm text-muted-foreground">
          Pending: <span className="font-semibold text-destructive">{formatCurrency(pendingAmount)}</span>
        </p>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="payrollId" value={payrollId} />
          <div className="space-y-1.5">
            <Label htmlFor="amount">Amount (₹)</Label>
            <Input id="amount" name="amount" type="number" step="0.01" min="0.01" max={pendingAmount} defaultValue={pendingAmount} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="paymentDate">Payment Date</Label>
            <Input id="paymentDate" name="paymentDate" type="date" defaultValue={today} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="paymentMode">Payment Mode</Label>
            <NativeSelect id="paymentMode" name="paymentMode" defaultValue="CASH">
              <option value="CASH">Cash</option>
              <option value="BANK_TRANSFER">Bank Transfer</option>
              <option value="UPI">UPI</option>
              <option value="CHEQUE">Cheque</option>
            </NativeSelect>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="referenceNo">Reference Number (optional)</Label>
            <Input id="referenceNo" name="referenceNo" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="note">Note (optional)</Label>
            <Input id="note" name="note" />
          </div>

          {state?.error && (
            <div className="rounded-lg bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive">{state.error}</div>
          )}

          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Recording..." : "Save Payment"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
