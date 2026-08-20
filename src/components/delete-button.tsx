"use client";

import { useActionState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type DeleteResult = { error?: string } | void;

export function DeleteButton({
  action,
  hiddenFields,
  confirmMessage = "Are you sure you want to delete this? This cannot be undone.",
  label,
  size = "icon-sm",
  className,
}: {
  action: (formData: FormData) => DeleteResult | Promise<DeleteResult>;
  hiddenFields: Record<string, string>;
  confirmMessage?: string;
  label?: string;
  size?: "icon-sm" | "sm" | "default";
  className?: string;
}) {
  const [state, formAction] = useActionState(
    async (_prevState: { error?: string } | undefined, formData: FormData) =>
      (await action(formData)) ?? undefined,
    undefined
  );

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (!window.confirm(confirmMessage)) {
          e.preventDefault();
        }
      }}
    >
      {Object.entries(hiddenFields).map(([key, value]) => (
        <input key={key} type="hidden" name={key} value={value} />
      ))}
      <Button
        type="submit"
        variant="ghost"
        size={size}
        className={cn("text-destructive hover:bg-destructive/10 hover:text-destructive", className)}
      >
        <Trash2 />
        {label}
      </Button>
      {state?.error && <p className="mt-1 text-xs font-normal text-destructive">{state.error}</p>}
    </form>
  );
}
