"use client";

import { useActionState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Button } from "@/components/ui/button";
import { updateStationaryPaymentAction } from "@/app/actions/stationary";
import { formatDateInput } from "@/lib/utils";

type PaymentValues = {
  id: string;
  amount: number;
  mode: string;
  remarks: string | null;
  paymentDate: Date | string;
};

export function EditStationaryPaymentForm({ payment }: { payment: PaymentValues }) {
  const [state, formAction, pending] = useActionState(updateStationaryPaymentAction, undefined);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="id" value={payment.id} />

      <div className="space-y-1.5">
        <Label htmlFor="amount">Amount (₹)</Label>
        <Input
          id="amount"
          name="amount"
          type="number"
          step="0.01"
          min="0.01"
          required
          defaultValue={payment.amount}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="paymentDate">Payment Date</Label>
        <Input
          id="paymentDate"
          name="paymentDate"
          type="date"
          defaultValue={formatDateInput(payment.paymentDate)}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="mode">Payment Mode</Label>
        <NativeSelect id="mode" name="mode" defaultValue={payment.mode}>
          <option value="CASH">Cash</option>
          <option value="ONLINE">Online / UPI</option>
          <option value="CHEQUE">Cheque</option>
          <option value="CARD">Card</option>
        </NativeSelect>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="remarks">Remarks (optional)</Label>
        <Input id="remarks" name="remarks" defaultValue={payment.remarks || ""} placeholder="e.g. Pending balance cleared" />
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
