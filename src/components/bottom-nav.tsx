"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getVisibleNavSections,
  BOTTOM_NAV_PRIORITY_HREFS,
  type NavItem,
  type NavPermissions,
} from "@/lib/nav-sections";
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";

const MAX_SLOTS = 4;

function isActive(pathname: string | null, href: string) {
  return pathname === href || (href !== "/dashboard" && !!pathname?.startsWith(href));
}

/** Sidebar tones are pastel (e.g. text-blue-300) for the dark sidebar; darken for the white mobile bar. */
function strongTone(tone: string) {
  return tone.replace(/-300$/, "-600");
}

export function BottomNav({ permissions = "all" }: { permissions?: NavPermissions }) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  const sections = getVisibleNavSections(permissions);
  const allItems: NavItem[] = sections.flatMap((section) => section.items);

  if (allItems.length === 0) return null;

  const priorityItems = BOTTOM_NAV_PRIORITY_HREFS
    .map((href) => allItems.find((item) => item.href === href))
    .filter((item): item is NavItem => Boolean(item));

  const fillerItems = allItems.filter((item) => !priorityItems.includes(item));
  const mainItems = [...priorityItems, ...fillerItems].slice(0, MAX_SLOTS);
  const mainHrefs = new Set(mainItems.map((item) => item.href));
  const moreSections = sections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => !mainHrefs.has(item.href)),
    }))
    .filter((section) => section.items.length > 0);
  const hasMore = moreSections.length > 0;

  return (
    <>
      <nav
        className="fixed inset-x-0 bottom-0 z-30 flex border-t border-border bg-background pb-[min(env(safe-area-inset-bottom),0.5rem)] shadow-[0_-4px_16px_-8px_rgba(0,0,0,0.15)] lg:hidden print:hidden"
      >
        {mainItems.map((item) => {
          const ItemIcon = item.icon;
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[10px] leading-none font-medium transition-colors",
                active ? "text-foreground" : "text-muted-foreground"
              )}
            >
              <ItemIcon className={cn("h-5 w-5", active ? strongTone(item.tone) : "text-current opacity-70")} />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
        {hasMore && (
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            className="flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[10px] leading-none font-medium text-muted-foreground transition-colors"
          >
            <MoreHorizontal className="h-5 w-5 opacity-70" />
            <span className="truncate">More</span>
          </button>
        )}
      </nav>

      {hasMore && (
        <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
          <SheetContent
            side="bottom"
            className="max-h-[75vh] overflow-y-auto rounded-t-2xl bg-background p-0 text-foreground lg:hidden"
          >
            <SheetTitle className="sr-only">More</SheetTitle>
            <div className="space-y-4 px-4 pt-6 pb-6">
              {moreSections.map((section) => (
                <div key={section.label}>
                  <p className="mb-1.5 px-1 text-[9.5px] font-bold tracking-[0.1em] text-muted-foreground/70 uppercase">
                    {section.label}
                  </p>
                  <div className="space-y-0.5">
                    {section.items.map((item) => {
                      const ItemIcon = item.icon;
                      const active = isActive(pathname, item.href);
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setMoreOpen(false)}
                          className={cn(
                            "flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors",
                            active ? "bg-accent text-accent-foreground" : "text-foreground/75 hover:bg-accent/50"
                          )}
                        >
                          <span
                            className={cn(
                              "flex h-6 w-6 shrink-0 items-center justify-center rounded-md",
                              active ? "bg-black/5" : "bg-transparent"
                            )}
                          >
                            <ItemIcon className={cn("h-3.5 w-3.5", active ? strongTone(item.tone) : "text-current opacity-70")} />
                          </span>
                          <span className="truncate">{item.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </SheetContent>
        </Sheet>
      )}
    </>
  );
}
