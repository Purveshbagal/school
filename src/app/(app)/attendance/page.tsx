import Link from "next/link";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { MONTH_NAMES } from "@/lib/payroll-engine";
import { CalendarCheck } from "lucide-react";

export default async function AttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; year?: string }>;
}) {
  const { month: monthParam, year: yearParam } = await searchParams;
  const now = new Date();
  const month = Number(monthParam) || now.getMonth() + 1;
  const year = Number(yearParam) || now.getFullYear();

  const teachers = await prisma.teacher.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      attendanceSummaries: { where: { month, year, deletedAt: null }, take: 1 },
    },
  });

  const years = Array.from({ length: 6 }, (_, i) => now.getFullYear() - 3 + i);

  return (
    <div>
      <PageHeader
        title="Attendance"
        description="Monthly attendance totals per teacher — payroll reads this automatically when generating salary"
      />

      <Card>
        <CardContent>
          <form className="mb-4 flex flex-wrap items-end gap-3" action="/attendance">
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Month</label>
              <NativeSelect name="month" defaultValue={month} className="w-36">
                {MONTH_NAMES.map((m, i) => (
                  <option key={m} value={i + 1}>{m}</option>
                ))}
              </NativeSelect>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Year</label>
              <NativeSelect name="year" defaultValue={year} className="w-28">
                {years.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </NativeSelect>
            </div>
            <Button type="submit" variant="outline">Go</Button>
          </form>

          {teachers.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">No staff members added yet.</p>
          ) : (
            <>
              <div className="space-y-3 md:hidden">
                {teachers.map((t) => {
                  const summary = t.attendanceSummaries[0];
                  return (
                    <Link
                      key={t.id}
                      href={`/attendance/${t.id}?month=${month}&year=${year}`}
                      className="block rounded-xl border border-border p-3.5 transition hover:border-primary/50 hover:bg-accent/40"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-medium">{t.name}</p>
                          <p className="mt-0.5 text-xs text-muted-foreground">{t.designation || "Staff"}</p>
                        </div>
                        {summary ? (
                          <Badge variant="success">Saved</Badge>
                        ) : (
                          <Badge variant="outline">Not entered</Badge>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>

              <Table className="hidden md:table">
                <TableHeader>
                  <TableRow>
                    <TableHead>Staff Member</TableHead>
                    <TableHead>Working Days</TableHead>
                    <TableHead>Absent</TableHead>
                    <TableHead>Half Day</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teachers.map((t) => {
                    const summary = t.attendanceSummaries[0];
                    return (
                      <TableRow key={t.id}>
                        <TableCell className="font-medium">
                          <Link href={`/attendance/${t.id}?month=${month}&year=${year}`} className="hover:text-primary hover:underline">
                            {t.name}
                          </Link>
                        </TableCell>
                        <TableCell>{summary?.workingDays ?? "-"}</TableCell>
                        <TableCell>{summary?.absentDays ?? "-"}</TableCell>
                        <TableCell>{summary?.halfDays ?? "-"}</TableCell>
                        <TableCell>
                          {summary ? <Badge variant="success">Saved</Badge> : <Badge variant="outline">Not entered</Badge>}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            render={<Link href={`/attendance/${t.id}?month=${month}&year=${year}`}><CalendarCheck /> {summary ? "Edit" : "Enter"}</Link>}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
