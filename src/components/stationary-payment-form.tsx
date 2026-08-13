"use client";

import { useActionState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Button } from "@/components/ui/button";
import { recordStationaryPaymentAction } from "@/app/actions/stationary";
import { formatCurrency } from "@/lib/utils";

export function StationaryPaymentForm({
  saleId,
  totalAmount,
  totalPaid,
  due,
  today,
}: {
  saleId: string;
  totalAmount: number;
  totalPaid: number;
  due: number;
  today: string;
}) {
  const [state, formAction, pending] = useActionState(recordStationaryPaymentAction, undefined);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="saleId" value={saleId} />

      <div className="grid grid-cols-3 gap-2 rounded-lg bg-muted/60 p-3 text-center text-sm">
        <div>
          <p className="text-xs text-muted-foreground">Total Amount</p>
          <p className="font-semibold">{formatCurrency(totalAmount)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Received</p>
          <p className="font-semibold text-success">{formatCurrency(totalPaid)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Pending</p>
          <p className={`font-semibold ${due > 0 ? "text-destructive" : "text-info"}`}>
            {formatCurrency(Math.abs(due))}
          </p>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="amount">Amount (₹)</Label>
        <Input
          id="amount"
          name="amount"
          type="number"
          step="0.01"
          min="0.01"
          required
          defaultValue={due > 0 ? due : undefined}
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
        <Input id="remarks" name="remarks" placeholder="e.g. Pending balance cleared" />
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
