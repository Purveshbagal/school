import Link from "next/link";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DeleteButton } from "@/components/delete-button";
import { deleteAccessAction } from "@/app/actions/access";
import { GRANTABLE_NAV_SECTIONS } from "@/lib/nav-sections";
import { formatDate, cn } from "@/lib/utils";
import { LocationsManager } from "./locations/locations-manager";
import { SwitchYearForm } from "./switch-year-form";
import { UndoYearTransitionButton } from "./undo-year-transition-button";
import { isYearTransitionRevertible } from "@/app/actions/academic-year";
import { Plus, Pencil, KeyRound, KeySquare, MapPin, CalendarRange } from "lucide-react";

const LABEL_BY_HREF = new Map(
  GRANTABLE_NAV_SECTIONS.flatMap((section) => section.items.map((item) => [item.href, item.label]))
);

const TABS = [
  { value: "access", label: "Access Control", icon: KeySquare },
  { value: "locations", label: "Village Setting", icon: MapPin },
  { value: "year", label: "Academic Year", icon: CalendarRange },
] as const;

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab: tabParam } = await searchParams;
  const tab = tabParam === "locations" ? "locations" : tabParam === "year" ? "year" : "access";

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Settings" description="School configuration" />

      <div className="mb-6 flex gap-1.5 border-b border-border">
        {TABS.map((t) => (
          <Link
            key={t.value}
            href={`/settings?tab=${t.value}`}
            className={cn(
              "-mb-px flex items-center gap-1.5 border-b-2 px-3.5 py-2 text-sm font-medium transition-colors",
              tab === t.value
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </Link>
        ))}
      </div>

      {tab === "access" ? (
        <AccessControlPanel />
      ) : tab === "locations" ? (
        <LocationsPanel />
      ) : (
        <AcademicYearPanel />
      )}
    </div>
  );
}

async function AccessControlPanel() {
  const accounts = await prisma.staffAccess.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Give teachers a login that only shows the functions you allow</p>
        <Button size="sm" render={<Link href="/settings/access/new" />}>
          <Plus /> Give Access
        </Button>
      </div>

      <Card>
        <CardContent>
          {accounts.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center text-sm text-muted-foreground">
              <KeyRound className="h-8 w-8 text-muted-foreground/40" />
              <p>No staff accounts yet. Click &quot;Give Access&quot; to create one.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {accounts.map((a) => (
                <div key={a.id} className="rounded-lg border border-border p-3.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium">{a.teacherName}</p>
                      <p className="font-mono text-xs text-muted-foreground">@{a.username}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        render={<Link href={`/settings/access/${a.id}/edit`}><Pencil /></Link>}
                      />
                      <DeleteButton
                        action={deleteAccessAction}
                        hiddenFields={{ id: a.id }}
                        confirmMessage={`Revoke access for ${a.teacherName} (@${a.username})? They will no longer be able to sign in.`}
                      />
                    </div>
                  </div>
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {a.permissions.map((href) => (
                      <Badge key={href} variant="outline">
                        {LABEL_BY_HREF.get(href) || href}
                      </Badge>
                    ))}
                  </div>
                  <p className="mt-2.5 text-xs text-muted-foreground">
                    Access given on {formatDate(a.createdAt)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}

async function LocationsPanel() {
  const districts = await prisma.district.findMany({
    orderBy: { name: "asc" },
    include: { talukas: { orderBy: { name: "asc" }, include: { villages: { orderBy: { name: "asc" } } } } },
  });

  return (
    <>
      <p className="mb-4 text-sm text-muted-foreground">
        Manage the address list used by the admission form&apos;s District / Taluka / Village dropdowns
      </p>
      <LocationsManager districts={districts} />
    </>
  );
}

async function AcademicYearPanel() {
  const [settings, activeStudentCount, latestTransition] = await Promise.all([
    prisma.schoolSettings.findUnique({ where: { id: "main" } }),
    prisma.student.count({ where: { status: "ACTIVE" } }),
    prisma.yearTransition.findFirst({ where: { revertedAt: null }, orderBy: { createdAt: "desc" } }),
  ]);
  const currentYear = settings?.academicYear || "2026-27";

  const revertInfo = latestTransition
    ? await isYearTransitionRevertible(latestTransition.id)
    : null;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Current Academic Year</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <p className="text-3xl font-bold">{currentYear}</p>
          <p className="text-sm text-muted-foreground">
            Switching the year promotes every <strong>active</strong> student to their next standard
            (highest standard stays put) and carries forward any pending fees. Inactive students are
            left untouched.
          </p>
          <SwitchYearForm currentYear={currentYear} activeStudentCount={activeStudentCount} />
        </CardContent>
      </Card>

      {latestTransition && (
        <Card>
          <CardHeader>
            <CardTitle>Last Switch</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm">
              {latestTransition.fromYear} → {latestTransition.toYear} ·{" "}
              {latestTransition.studentCount} student{latestTransition.studentCount === 1 ? "" : "s"}{" "}
              promoted · {formatDate(latestTransition.createdAt)}
            </p>
            <UndoYearTransitionButton
              transitionId={latestTransition.id}
              fromYear={latestTransition.fromYear}
              toYear={latestTransition.toYear}
              revertible={revertInfo?.revertible ?? false}
              reason={revertInfo?.reason}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
