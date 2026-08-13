"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

type Tab = { label: string; value: string; count: number };

export function StudentsBoardTabs({ tabs }: { tabs: Tab[] }) {
  const searchParams = useSearchParams();
  const current = searchParams.get("board") || "";

  function hrefFor(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set("board", value);
    else params.delete("board");
    const qs = params.toString();
    return `/students${qs ? `?${qs}` : ""}`;
  }

  return (
    <div className="mb-4 flex gap-1.5 overflow-x-auto border-b border-border">
      {tabs.map((tab) => (
        <Link
          key={tab.label}
          href={hrefFor(tab.value)}
          className={cn(
            "-mb-px shrink-0 border-b-2 px-3.5 py-2 text-sm font-medium transition-colors",
            current === tab.value
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          {tab.label} <span className="text-xs text-muted-foreground">({tab.count})</span>
        </Link>
      ))}
    </div>
  );
}
