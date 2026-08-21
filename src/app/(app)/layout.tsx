import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { SidebarNav } from "@/components/sidebar-nav";
import { Topbar } from "@/components/topbar";
import { BottomNav } from "@/components/bottom-nav";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const [settings, notifications] = await Promise.all([
    prisma.schoolSettings.findUnique({ where: { id: "main" } }),
    prisma.notification.findMany({ orderBy: { createdAt: "desc" }, take: 20 }),
  ]);
  const schoolName = settings?.name || "My School";
  const permissions = session.role === "admin" ? ("all" as const) : session.permissions;

  return (
    <div className="min-h-screen">
      <SidebarNav
        schoolName={schoolName}
        username={session.teacherName || session.username}
        permissions={permissions}
        notifications={notifications}
      />
      <div className="lg:pl-64">
        <Topbar
          schoolName={schoolName}
          username={session.teacherName || session.username}
          permissions={permissions}
          notifications={notifications}
        />
        <main className="w-full px-4 py-6 pb-20 sm:px-6 lg:px-8 lg:py-8 lg:pb-8 2xl:px-12">
          {children}
        </main>
      </div>
      <BottomNav permissions={permissions} />
    </div>
  );
}
