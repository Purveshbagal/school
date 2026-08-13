"use client";

import { useActionState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { updateVillageBusFeeAction } from "@/app/actions/bus-fees";

export function VillageFeeForm({ villageId, busFee }: { villageId: string; busFee: number }) {
  const [state, formAction, pending] = useActionState(updateVillageBusFeeAction, undefined);

  return (
    <form action={formAction} className="flex items-center gap-2">
      <input type="hidden" name="villageId" value={villageId} />
      <Input
        name="busFee"
        type="number"
        step="0.01"
        min="0"
        defaultValue={busFee}
        className="h-8 w-28"
      />
      <Button type="submit" size="sm" variant="outline" disabled={pending}>
        {pending ? "Saving..." : "Save"}
      </Button>
      {state?.error && <span className="text-xs text-destructive">{state.error}</span>}
    </form>
  );
}
