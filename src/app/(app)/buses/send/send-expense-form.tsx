"use client";

import { useActionState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Button } from "@/components/ui/button";
import { sendBusExpenseAction } from "@/app/actions/buses";

type Bus = { id: string; vehicleNumber: string; driverName: string | null };

export function SendExpenseForm({ buses, today }: { buses: Bus[]; today: string }) {
  const [state, formAction, pending] = useActionState(sendBusExpenseAction, undefined);

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="busId">Bus / Vehicle *</Label>
        <NativeSelect id="busId" name="busId" required defaultValue="">
          <option value="">Select a bus</option>
          {buses.map((b) => (
            <option key={b.id} value={b.id}>
              {b.vehicleNumber}
              {b.driverName ? ` — ${b.driverName}` : ""}
            </option>
          ))}
        </NativeSelect>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="amount">Diesel/Fuel Amount (₹) *</Label>
        <Input id="amount" name="amount" type="number" step="0.01" min="0.01" required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="liters">Liters (optional)</Label>
        <Input id="liters" name="liters" type="number" step="0.01" min="0" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="date">Date</Label>
        <Input id="date" name="date" type="date" defaultValue={today} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="remarks">Remarks (optional)</Label>
        <Input id="remarks" name="remarks" placeholder="e.g. Full tank, HP Petrol Pump" />
      </div>
      {state?.error && (
        <div className="rounded-lg bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive">
          {state.error}
        </div>
      )}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Sending..." : "Send Amount"}
      </Button>
    </form>
  );
}
