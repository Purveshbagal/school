"use client";

import { useActionState, useState } from "react";
import { CheckCircle2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createNoticeAction } from "@/app/actions/notices";
import { cn } from "@/lib/utils";

export function NoticeForm({ standards }: { standards: { id: string; name: string }[] }) {
  const [state, formAction, pending] = useActionState(createNoticeAction, undefined);
  const [audience, setAudience] = useState<"all" | "standards">("all");
  // React clears the form's fields after a successful send; reset the audience with them.
  const [handledOk, setHandledOk] = useState<number | undefined>();
  if (state?.ok && state.ok !== handledOk) {
    setHandledOk(state.ok);
    setAudience("all");
  }

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="title">Title *</Label>
        <Input id="title" name="title" required maxLength={200} placeholder="e.g. School closed on Monday" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="message">Message *</Label>
        <Textarea id="message" name="message" required maxLength={5000} rows={5} className="min-h-28" placeholder="Write the notice for students and parents…" />
      </div>

      <fieldset className="space-y-2">
        <legend className="mb-1.5 text-sm font-medium">Send to</legend>
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              ["all", "All students"],
              ["standards", "Selected standards"],
            ] as const
          ).map(([value, label]) => (
            <label
              key={value}
              className={cn(
                "flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm",
                audience === value ? "border-primary bg-primary/5 font-medium" : "border-border"
              )}
            >
              <input
                type="radio"
                name="audience"
                value={value}
                checked={audience === value}
                onChange={() => setAudience(value)}
                className="accent-primary"
              />
              {label}
            </label>
          ))}
        </div>
        {audience === "standards" && (
          <div className="grid grid-cols-2 gap-1.5 rounded-lg border border-border p-2.5 sm:grid-cols-3">
            {standards.map((s) => (
              <label key={s.id} className="flex cursor-pointer items-center gap-2 rounded px-1.5 py-1 text-sm hover:bg-muted">
                <input type="checkbox" name="standardIds" value={s.id} className="accent-primary" />
                {s.name}
              </label>
            ))}
          </div>
        )}
      </fieldset>

      {state?.error && (
        <div className="rounded-lg bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive">{state.error}</div>
      )}
      {state?.ok && !pending && (
        <div className="flex items-center gap-2 rounded-lg bg-success/10 px-3.5 py-2.5 text-sm text-success">
          <CheckCircle2 className="h-4 w-4" /> Notice sent to the student app.
        </div>
      )}

      <Button type="submit" className="w-full" disabled={pending}>
        <Send /> {pending ? "Sending..." : "Send Notice"}
      </Button>
    </form>
  );
}
