"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { addBusExpenseAction } from "@/app/actions/buses";

export function ExpenseForm({ busId, today }: { busId: string; today: string }) {
  return (
    <form action={addBusExpenseAction} className="space-y-4">
      <input type="hidden" name="busId" value={busId} />
      <div className="space-y-1.5">
        <Label htmlFor="amount">Diesel/Fuel Amount (₹)</Label>
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
      <Button type="submit" className="w-full">
        Record Expense
      </Button>
    </form>
  );
}
