"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
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

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-border bg-background/95 px-4 backdrop-blur lg:hidden print:hidden">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger
          render={
            <Button variant="ghost" size="icon">
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
      <p className="text-sm font-semibold">{schoolName}</p>
    </header>
  );
}
