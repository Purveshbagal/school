"use client";

import { useActionState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { lockPayrollAction, unlockPayrollAction } from "@/app/actions/payroll/payroll";
import { formatDate } from "@/lib/utils";
import { Lock, LockOpen } from "lucide-react";

export function LockControls({
  payrollId,
  locked,
  lockedBy,
  lockedAt,
}: {
  payrollId: string;
  locked: boolean;
  lockedBy: string | null;
  lockedAt: Date | null;
}) {
  const [lockState, lockAction, lockPending] = useActionState(lockPayrollAction, undefined);
  const [unlockState, unlockAction, unlockPending] = useActionState(unlockPayrollAction, undefined);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {locked ? <Lock className="h-4 w-4" /> : <LockOpen className="h-4 w-4" />} Payroll Lock
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {locked ? (
          <>
            <p className="text-sm text-muted-foreground">
              Locked{lockedBy ? ` by ${lockedBy}` : ""}{lockedAt ? ` on ${formatDate(lockedAt)}` : ""}. Attendance and salary can no longer be edited.
            </p>
            <form action={unlockAction}>
              <input type="hidden" name="id" value={payrollId} />
              {unlockState?.error && <p className="mb-2 text-xs text-destructive">{unlockState.error}</p>}
              <Button type="submit" variant="outline" className="w-full" disabled={unlockPending}>
                <LockOpen /> {unlockPending ? "Unlocking..." : "Unlock (Admin Only)"}
              </Button>
            </form>
          </>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              Lock this month once payroll is finalized to prevent further attendance or salary edits.
            </p>
            <form action={lockAction}>
              <input type="hidden" name="id" value={payrollId} />
              {lockState?.error && <p className="mb-2 text-xs text-destructive">{lockState.error}</p>}
              <Button type="submit" variant="outline" className="w-full" disabled={lockPending}>
                <Lock /> {lockPending ? "Locking..." : "Lock Payroll"}
              </Button>
            </form>
          </>
        )}
      </CardContent>
    </Card>
  );
}
