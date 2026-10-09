"use client";

import { useState } from "react";
import { Menu, GraduationCap, ChevronRight } from "lucide-react";
import { usePathname } from "next/navigation";
import { getVisibleNavSections } from "@/lib/nav-sections";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { NavLinks, SidebarBrand, SidebarFooter, type NavPermissions } from "@/components/sidebar-nav";
import type { NotificationItem } from "@/components/notification-bell";

export function Topbar({
  schoolName,
  username,
  permissions = "all",
  notifications = [],
}: {
  schoolName: string;
  username?: string;
  permissions?: NavPermissions;
  notifications?: NotificationItem[];
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const currentPage = getVisibleNavSections(permissions).flatMap(section => section.items)
    .filter(item => pathname === item.href || pathname.startsWith(`${item.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0]?.label || "Workspace";

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border bg-card/95 px-4 backdrop-blur lg:h-20 lg:px-8 print:hidden">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger
          render={
            <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open navigation">
              <Menu className="h-5 w-5" />
            </Button>
          }
        />
        <SheetContent side="left" className="w-64 flex-col bg-sidebar p-0 text-sidebar-foreground">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SidebarBrand schoolName={schoolName} />
          <NavLinks onNavigate={() => setOpen(false)} permissions={permissions} />
          <SidebarFooter username={username} notifications={notifications} />
        </SheetContent>
      </Sheet>
      <GraduationCap className="hidden size-5 text-primary lg:block" />
      <p className="min-w-0 truncate text-sm font-semibold">{schoolName}</p>
      <ChevronRight className="hidden size-4 text-muted-foreground lg:block" />
      <span className="hidden text-sm text-muted-foreground lg:block">{currentPage}</span>
      <div className="ml-auto hidden items-center gap-3 sm:flex">
        <div className="text-right">
          <p className="text-sm font-medium capitalize">{username || "Staff"}</p>
          <p className="text-xs text-muted-foreground">School workspace</p>
        </div>
        <span className="flex size-10 items-center justify-center rounded-xl border border-primary/15 bg-primary/10 text-sm font-semibold text-primary">
          {(username || "S").charAt(0).toUpperCase()}
        </span>
      </div>
    </header>
  );
}
