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
import { formatCurrency } from "@/lib/utils";
import { MONTH_NAMES } from "@/lib/payroll-engine";
import { startOfMonth, endOfMonth } from "date-fns";
import { CircleDollarSign } from "lucide-react";

const STATUS_VARIANT: Record<string, "success" | "warning" | "destructive" | "outline"> = {
  PAID: "success",
  PARTIALLY_PAID: "warning",
  GENERATED: "destructive",
};

export default async function PayrollDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; year?: string }>;
}) {
  const { month: monthParam, year: yearParam } = await searchParams;
  const now = new Date();
  const month = Number(monthParam) || now.getMonth() + 1;
  const year = Number(yearParam) || now.getFullYear();
  const years = Array.from({ length: 6 }, (_, i) => now.getFullYear() - 3 + i);

  const periodStart = startOfMonth(new Date(year, month - 1, 1));
  const periodEnd = endOfMonth(new Date(year, month - 1, 1));

  const [teachers, payrolls, advanceAgg] = await Promise.all([
    prisma.teacher.findMany({
      orderBy: { createdAt: "desc" },
      include: { payrolls: { where: { month, year, deletedAt: null }, take: 1 } },
    }),
    prisma.payroll.findMany({ where: { month, year, deletedAt: null } }),
    prisma.advancePayment.aggregate({
      where: { date: { gte: periodStart, lte: periodEnd }, deletedAt: null },
      _sum: { amount: true },
    }),
  ]);

  const totalTeachers = teachers.length;
  const salaryThisMonth = payrolls.reduce((s, p) => s + p.netPayable, 0);
  const paid = payrolls.reduce((s, p) => s + p.paidAmount, 0);
  const pending = payrolls.reduce((s, p) => s + p.pendingAmount, 0);
  const partiallyPaidCount = payrolls.filter((p) => p.status === "PARTIALLY_PAID").length;
  const totalDeductions = payrolls.reduce(
    (s, p) => s + p.leaveDeduction + p.halfDayDeduction + p.lateDeduction + p.otherDeductionsTotal,
    0
  );
  const advanceGiven = advanceAgg._sum.amount || 0;
  const generatedCount = payrolls.length;
  const upcomingSalary = Math.max(0, totalTeachers - generatedCount);

  const cards = [
    { label: "Total Teachers", value: String(totalTeachers), tone: "text-foreground" },
    { label: "Salary This Month", value: formatCurrency(salaryThisMonth), tone: "text-foreground" },
    { label: "Paid", value: formatCurrency(paid), tone: "text-success" },
    { label: "Pending", value: formatCurrency(pending), tone: "text-destructive" },
    { label: "Partially Paid", value: String(partiallyPaidCount), tone: "text-warning" },
    { label: "Advance Given", value: formatCurrency(advanceGiven), tone: "text-info" },
    { label: "Total Deductions", value: formatCurrency(totalDeductions), tone: "text-foreground" },
    { label: "Not Yet Generated", value: String(upcomingSalary), tone: "text-foreground" },
  ];

  return (
    <div>
      <PageHeader title="Payroll" description="Monthly payroll generation, review and settlement for every teacher" />

      <form className="mb-4 flex flex-wrap items-end gap-3" action="/payroll">
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

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.label} size="sm">
            <CardContent>
              <p className="text-xs text-muted-foreground">{c.label}</p>
              <p className={`mt-1 text-lg font-semibold ${c.tone}`}>{c.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent>
          {teachers.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">No staff members added yet.</p>
          ) : (
            <>
              <div className="space-y-3 md:hidden">
                {teachers.map((t) => {
                  const p = t.payrolls[0];
                  return (
                    <Link
                      key={t.id}
                      href={`/payroll/${t.id}?month=${month}&year=${year}`}
                      className="block rounded-xl border border-border p-3.5 transition hover:border-primary/50 hover:bg-accent/40"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-medium">{t.name}</p>
                          <p className="mt-0.5 text-xs text-muted-foreground">{t.designation || "Staff"}</p>
                        </div>
                        <div className="text-right">
                          {p ? (
                            <>
                              <p className="font-semibold">{formatCurrency(p.netPayable)}</p>
                              <Badge variant={STATUS_VARIANT[p.status] || "outline"}>{p.status.replace("_", " ")}</Badge>
                            </>
                          ) : (
                            <Badge variant="outline">Not Generated</Badge>
                          )}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>

              <Table className="hidden md:table">
                <TableHeader>
                  <TableRow>
                    <TableHead>Staff Member</TableHead>
                    <TableHead>Net Payable</TableHead>
                    <TableHead>Paid</TableHead>
                    <TableHead>Pending</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teachers.map((t) => {
                    const p = t.payrolls[0];
                    return (
                      <TableRow key={t.id}>
                        <TableCell className="font-medium">
                          <Link href={`/payroll/${t.id}?month=${month}&year=${year}`} className="hover:text-primary hover:underline">
                            {t.name}
                          </Link>
                        </TableCell>
                        <TableCell>{p ? formatCurrency(p.netPayable) : "-"}</TableCell>
                        <TableCell>{p ? formatCurrency(p.paidAmount) : "-"}</TableCell>
                        <TableCell>{p ? formatCurrency(p.pendingAmount) : "-"}</TableCell>
                        <TableCell>
                          {p ? (
                            <Badge variant={STATUS_VARIANT[p.status] || "outline"}>{p.status.replace("_", " ")}</Badge>
                          ) : (
                            <Badge variant="outline">Not Generated</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            render={<Link href={`/payroll/${t.id}?month=${month}&year=${year}`}><CircleDollarSign /> {p ? "Review" : "Generate"}</Link>}
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
