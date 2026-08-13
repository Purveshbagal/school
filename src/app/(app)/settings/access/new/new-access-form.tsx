"use client";

import { useActionState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { PermissionsPicker } from "@/components/permissions-picker";
import { createAccessAction } from "@/app/actions/access";

export function NewAccessForm() {
  const [state, formAction, pending] = useActionState(createAccessAction, undefined);

  return (
    <Card>
      <CardContent>
        <form action={formAction} className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="teacherName">Teacher Name *</Label>
            <Input id="teacherName" name="teacherName" required placeholder="e.g. Sunita Patil" />
          </div>

          <div className="space-y-1.5">
            <Label>Select Access *</Label>
            <PermissionsPicker />
            <p className="text-xs text-muted-foreground">
              Only the selected functions will be visible to this teacher after login.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="username">Username *</Label>
              <Input id="username" name="username" required autoComplete="off" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password *</Label>
              <Input id="password" name="password" type="password" required autoComplete="new-password" />
            </div>
          </div>

          {state?.error && (
            <div className="rounded-lg bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive">
              {state.error}
            </div>
          )}

          <Button type="submit" size="lg" className="w-full" disabled={pending}>
            {pending ? "Creating..." : "Create Access"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
