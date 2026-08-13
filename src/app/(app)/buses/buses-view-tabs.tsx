"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { label: "Payment History", value: "payments" },
  { label: "Vehicle History", value: "vehicles" },
] as const;

export function BusesViewTabs() {
  const searchParams = useSearchParams();
  const current = searchParams.get("view") || "payments";

  function hrefFor(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("view", value);
    return `/buses?${params.toString()}`;
  }

  return (
    <div className="mb-4 flex gap-1.5 border-b border-border">
      {TABS.map((tab) => (
        <Link
          key={tab.value}
          href={hrefFor(tab.value)}
          className={cn(
            "-mb-px shrink-0 border-b-2 px-3.5 py-2 text-sm font-medium transition-colors",
            current === tab.value
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}
