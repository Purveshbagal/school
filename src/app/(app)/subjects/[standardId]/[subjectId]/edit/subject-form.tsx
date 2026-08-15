"use client";

import { useActionState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { updateSubjectAction } from "@/app/actions/subjects";

export function SubjectForm({
  subject,
  standardId,
}: {
  subject: { id: string; name: string };
  standardId: string;
}) {
  const [state, formAction, pending] = useActionState(updateSubjectAction, undefined);

  return (
    <Card>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="id" value={subject.id} />
          <input type="hidden" name="standardId" value={standardId} />

          <div className="space-y-1.5">
            <Label htmlFor="name">Subject Name *</Label>
            <Input id="name" name="name" required defaultValue={subject.name} />
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
      </CardContent>
    </Card>
  );
}
