"use client";

import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function DeleteButton({
  action,
  hiddenFields,
  confirmMessage = "Are you sure you want to delete this? This cannot be undone.",
  label,
  size = "icon-sm",
  className,
}: {
  action: (formData: FormData) => void | Promise<void>;
  hiddenFields: Record<string, string>;
  confirmMessage?: string;
  label?: string;
  size?: "icon-sm" | "sm" | "default";
  className?: string;
}) {
  return (
    <form
      action={action}
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
    </form>
  );
}
