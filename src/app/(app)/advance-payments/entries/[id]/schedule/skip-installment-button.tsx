"use client";

import { useActionState } from "react";
import { SkipForward } from "lucide-react";
import { Button } from "@/components/ui/button";
import { skipAdvanceInstallmentAction } from "@/app/actions/payroll/advance-payments";

export function SkipInstallmentButton({
  id,
  teacherId,
  confirmMessage,
}: {
  id: string;
  teacherId: string;
  confirmMessage: string;
}) {
  const [state, formAction, pending] = useActionState(
    async (_prevState: { error?: string } | undefined, formData: FormData) =>
      (await skipAdvanceInstallmentAction(formData)) ?? undefined,
    undefined
  );

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (!window.confirm(confirmMessage)) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="teacherId" value={teacherId} />
      <Button type="submit" variant="ghost" size="icon-sm" disabled={pending} title="Skip this month — move to end of schedule">
        <SkipForward />
      </Button>
      {state?.error && <p className="mt-1 text-xs font-normal text-destructive">{state.error}</p>}
    </form>
  );
}
