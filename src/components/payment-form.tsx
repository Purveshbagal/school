"use client";

import { useActionState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Button } from "@/components/ui/button";
import { recordPaymentAction } from "@/app/actions/payments";
import { formatCurrency } from "@/lib/utils";

export function PaymentForm({
  studentId,
  suggestedAmount,
  totalFee,
  totalPaid,
  due,
  today,
}: {
  studentId: string;
  suggestedAmount: number;
  totalFee?: number;
  totalPaid?: number;
  due?: number;
  today: string;
}) {
  const [state, formAction, pending] = useActionState(recordPaymentAction, undefined);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="studentId" value={studentId} />

      {totalFee !== undefined && (
        <div className="grid grid-cols-3 gap-2 rounded-lg bg-muted/60 p-3 text-center text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Total Fee</p>
            <p className="font-semibold">{formatCurrency(totalFee)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Paid</p>
            <p className="font-semibold text-success">{formatCurrency(totalPaid || 0)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{due && due < 0 ? "Advance" : "Due"}</p>
            <p className={`font-semibold ${due && due > 0 ? "text-destructive" : "text-info"}`}>
              {formatCurrency(Math.abs(due || 0))}
            </p>
          </div>
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="amount">Amount (₹)</Label>
        <Input
          id="amount"
          name="amount"
          type="number"
          step="0.01"
          min="0.01"
          required
          defaultValue={suggestedAmount > 0 ? suggestedAmount : undefined}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="paymentDate">Payment Date</Label>
        <Input id="paymentDate" name="paymentDate" type="date" defaultValue={today} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="mode">Payment Mode</Label>
        <NativeSelect id="mode" name="mode" defaultValue="CASH">
          <option value="CASH">Cash</option>
          <option value="ONLINE">Online / UPI</option>
          <option value="CHEQUE">Cheque</option>
          <option value="CARD">Card</option>
        </NativeSelect>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="remarks">Remarks (optional)</Label>
        <Input id="remarks" name="remarks" placeholder="e.g. Term 1 fee" />
      </div>
      {state?.error && (
        <div className="rounded-lg bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive">
          {state.error}
        </div>
      )}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Recording..." : "Record Payment & Generate Receipt"}
      </Button>
    </form>
  );
}
