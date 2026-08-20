"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { undoYearTransitionAction } from "@/app/actions/academic-year";
import { Undo2 } from "lucide-react";

export function UndoYearTransitionButton({
  transitionId,
  fromYear,
  toYear,
  revertible,
  reason,
}: {
  transitionId: string;
  fromYear: string;
  toYear: string;
  revertible: boolean;
  reason?: string;
}) {
  const [state, formAction, pending] = useActionState(undoYearTransitionAction, undefined);

  if (!revertible) {
    return <p className="text-xs text-muted-foreground">{reason || "This switch can no longer be undone."}</p>;
  }

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (!window.confirm(`Undo the switch from ${fromYear} to ${toYear}? All promoted students will move back to ${fromYear}.`)) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={transitionId} />
      <Button type="submit" variant="outline" size="sm" disabled={pending}>
        <Undo2 /> {pending ? "Undoing..." : "Undo Switch"}
      </Button>
      {state?.error && <p className="mt-1.5 text-xs text-destructive">{state.error}</p>}
    </form>
  );
}
