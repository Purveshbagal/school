"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Radio, Route, UserCog } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/live-tracking", label: "Live Map", icon: Radio, match: (p: string) => p === "/live-tracking" },
  {
    href: "/live-tracking/history",
    label: "Trip History",
    icon: Route,
    match: (p: string) => p.startsWith("/live-tracking/history") || p.startsWith("/live-tracking/trips"),
  },
  {
    href: "/live-tracking/drivers",
    label: "Assign Driver",
    icon: UserCog,
    match: (p: string) => p.startsWith("/live-tracking/drivers"),
  },
] as const;

export function LiveTrackingTabs() {
  const pathname = usePathname() || "";

  return (
    <div className="mb-5 flex gap-1.5 overflow-x-auto overflow-y-hidden border-b border-border [scrollbar-width:none]">
      {TABS.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          className={cn(
            "-mb-px flex shrink-0 items-center gap-1.5 border-b-2 px-3.5 py-2 text-sm font-medium transition-colors",
            tab.match(pathname)
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <tab.icon className="h-4 w-4" />
          {tab.label}
        </Link>
      ))}
    </div>
  );
}
