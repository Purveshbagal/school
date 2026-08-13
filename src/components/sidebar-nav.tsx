"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut } from "lucide-react";
import { logoutAction } from "@/app/actions/auth";
import { cn } from "@/lib/utils";
import { NAV_SECTIONS } from "@/lib/nav-sections";
import { NotificationBell, type NotificationItem } from "@/components/notification-bell";

export { NAV_SECTIONS, GRANTABLE_NAV_SECTIONS } from "@/lib/nav-sections";

/** "all" for admins (full access); an array of granted hrefs for staff accounts. */
export type NavPermissions = "all" | string[];

function visibleSections(permissions: NavPermissions) {
  if (permissions === "all") return NAV_SECTIONS;
  return NAV_SECTIONS.filter((section) => section.label !== "Settings")
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => permissions.includes(item.href)),
    }))
    .filter((section) => section.items.length > 0);
}

export function NavLinks({
  onNavigate,
  permissions = "all",
}: {
  onNavigate?: () => void;
  permissions?: NavPermissions;
}) {
  const pathname = usePathname();
  const sections = visibleSections(permissions);

  return (
    <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
      {sections.map((section) => (
        <div key={section.label}>
          <p className="mb-1.5 px-2.5 text-[10.5px] font-bold tracking-[0.12em] text-sidebar-foreground/40 uppercase">
            {section.label}
          </p>
          <div className="space-y-0.5">
            {section.items.map((item) => {
              const active =
                pathname === item.href ||
                (item.href !== "/dashboard" && pathname?.startsWith(item.href));
              const ItemIcon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  className={cn(
                    "group relative flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm font-medium transition-all",
                    active
                      ? "bg-gradient-to-r from-sidebar-accent to-sidebar-accent/70 text-sidebar-accent-foreground shadow-sm shadow-black/20"
                      : "text-sidebar-foreground/65 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                  )}
                >
                  {active && (
                    <span className="absolute top-1.5 bottom-1.5 left-0 w-0.5 rounded-full bg-sidebar-primary shadow-[0_0_8px_var(--sidebar-primary)]" />
                  )}
                  <span
                    className={cn(
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors",
                      active ? "bg-white/10" : "bg-transparent group-hover:bg-white/5"
                    )}
                  >
                    <ItemIcon className={cn("h-4 w-4", active ? item.tone : "text-current opacity-80")} />
                  </span>
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

export function SidebarBrand({ schoolName }: { schoolName: string }) {
  return (
    <div className="relative flex min-h-16 items-center gap-3 overflow-hidden border-b border-sidebar-border px-5 py-3">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-sidebar-primary/15 via-transparent to-transparent" />
      <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white shadow-md shadow-black/30 ring-1 ring-white/10">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/image/logo.jpeg" alt="School Logo" className="h-full w-full object-contain" />
      </div>
      <div className="relative min-w-0">
        <p
          title={schoolName}
          className="line-clamp-2 text-sm leading-tight font-semibold text-sidebar-foreground"
        >
          {schoolName}
        </p>
        <p className="mt-0.5 text-[11px] text-sidebar-foreground/50">Management System</p>
      </div>
    </div>
  );
}

export function SignOutButton() {
  return (
    <form action={logoutAction}>
      <button
        type="submit"
        title="Sign out"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sidebar-foreground/60 transition hover:bg-destructive/15 hover:text-destructive"
      >
        <LogOut className="h-4 w-4" />
      </button>
    </form>
  );
}

export function SidebarFooter({
  username,
  notifications = [],
}: {
  username?: string;
  notifications?: NotificationItem[];
}) {
  const initial = (username || "A").charAt(0).toUpperCase();
  return (
    <div className="border-t border-sidebar-border p-3">
      <div className="flex items-center gap-2 rounded-lg bg-sidebar-accent/40 px-2.5 py-2">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sidebar-primary to-sidebar-primary/60 text-xs font-bold text-white shadow-sm">
          {initial}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold text-sidebar-foreground capitalize">
            {username || "Admin"}
          </p>
          <p className="text-[10.5px] text-sidebar-foreground/45">Administrator</p>
        </div>
        <NotificationBell notifications={notifications} />
        <SignOutButton />
      </div>
    </div>
  );
}

export function SidebarNav({
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
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-sidebar-border bg-sidebar shadow-[4px_0_24px_-8px_rgba(0,0,0,0.2)] lg:flex print:hidden">
      <SidebarBrand schoolName={schoolName} />
      <NavLinks permissions={permissions} />
      <SidebarFooter username={username} notifications={notifications} />
    </aside>
  );
}
