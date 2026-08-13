"use client";

import { useActionState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { PermissionsPicker } from "@/components/permissions-picker";
import { updateAccessAction } from "@/app/actions/access";

export function EditAccessForm({
  account,
}: {
  account: { id: string; teacherName: string; username: string; permissions: string[] };
}) {
  const [state, formAction, pending] = useActionState(updateAccessAction, undefined);

  return (
    <Card>
      <CardContent>
        <form action={formAction} className="space-y-5">
          <input type="hidden" name="id" value={account.id} />

          <div className="space-y-1.5">
            <Label htmlFor="teacherName">Teacher Name *</Label>
            <Input id="teacherName" name="teacherName" required defaultValue={account.teacherName} />
          </div>

          <div className="space-y-1.5">
            <Label>Username</Label>
            <Input value={account.username} disabled />
          </div>

          <div className="space-y-1.5">
            <Label>Select Access *</Label>
            <PermissionsPicker defaultValue={account.permissions} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">Reset Password (optional)</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              placeholder="Leave blank to keep current password"
            />
          </div>

          {state?.error && (
            <div className="rounded-lg bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive">
              {state.error}
            </div>
          )}

          <Button type="submit" size="lg" className="w-full" disabled={pending}>
            {pending ? "Saving..." : "Save Changes"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
