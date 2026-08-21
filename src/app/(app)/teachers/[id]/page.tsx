import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getActiveSalaryStructure, getOutstandingAdvanceTotal, getLastPayroll } from "@/lib/payroll-data";
import { resolveDateRange, TEACHER_HISTORY_RANGE_OPTIONS } from "@/lib/date-ranges";
import { MONTH_NAMES } from "@/lib/payroll-engine";
import { TeacherHistoryFilter } from "./teacher-history-filter";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DeleteButton } from "@/components/delete-button";
import { formatCurrency, formatDate } from "@/lib/utils";
import { deleteTeacherAction } from "@/app/actions/teachers";
import { Pencil, TrendingUp, CircleDollarSign, HandCoins, History } from "lucide-react";

export default async function TeacherDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ historyRange?: string }>;
}) {
  const { id } = await params;
  const { historyRange } = await searchParams;
  const teacher = await prisma.teacher.findUnique({ where: { id } });
  if (!teacher) notFound();

  const [structure, outstandingAdvance, lastPayroll, payrolls, advances, salaryPayments] = await Promise.all([
    getActiveSalaryStructure(id),
    getOutstandingAdvanceTotal(id),
    getLastPayroll(id),
    prisma.payroll.findMany({ where: { teacherId: id, deletedAt: null } }),
    prisma.advancePayment.findMany({ where: { teacherId: id, deletedAt: null } }),
    prisma.salaryPayment.findMany({ where: { teacherId: id, deletedAt: null } }),
  ]);
  const pendingFromLastPayroll = lastPayroll ? Math.max(0, lastPayroll.pendingAmount) : 0;

  // Generated column — salary generated from attendance, no paid/pending status shown.
  const generateEntries = payrolls
    .map((p) => ({
      kind: "salary" as const,
      id: p.id,
      date: new Date(p.year, p.month - 1, 1),
      amount: p.netPayable,
      month: p.month,
      year: p.year,
    }))
    .sort((a, b) => b.date.getTime() - a.date.getTime());

  // Paid column — advance given to the teacher, plus actual salary payments made.
  const paidEntries = [
    ...advances.map((a) => ({
      kind: "advance" as const,
      id: a.id,
      date: a.date,
      amount: a.amount,
      note: a.note,
    })),
    ...salaryPayments.map((p) => ({
      kind: "payment" as const,
      id: p.id,
      date: p.paymentDate,
      amount: p.amount,
      mode: p.paymentMode,
    })),
  ].sort((a, b) => b.date.getTime() - a.date.getTime());

  const { start, end } = resolveDateRange(historyRange, undefined, undefined);
  const isFiltered = Boolean(start && end);
  const historyRangeLabel = TEACHER_HISTORY_RANGE_OPTIONS.find((o) => o.value === (historyRange || "all"))?.label || "All Time";

  const filteredGenerateEntries = isFiltered ? generateEntries.filter((e) => e.date >= start! && e.date <= end!) : generateEntries;
  const filteredPaidEntries = isFiltered ? paidEntries.filter((e) => e.date >= start! && e.date <= end!) : paidEntries;

  const totalGenerated = filteredGenerateEntries.reduce((sum, e) => sum + e.amount, 0);
  const totalPaid = filteredPaidEntries.reduce((sum, e) => sum + e.amount, 0);

  return (
    <div>
      <PageHeader
        title={teacher.name}
        description={`Employee No: ${teacher.employeeNo} · ${teacher.designation || "Staff"}`}
        actions={
          <>
            <Button variant="outline" render={<Link href={`/teachers/${id}/edit`}><Pencil /> Edit</Link>} />
            <DeleteButton
              action={deleteTeacherAction}
              hiddenFields={{ id }}
              confirmMessage={`Delete ${teacher.name}? Their payroll history is kept for records but this cannot be undone for the teacher record itself.`}
              label="Delete"
              size="default"
              className="border border-transparent hover:border-destructive/20"
            />
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="min-w-0 space-y-6 lg:col-span-2">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
            <Card size="sm" className="border-t-2 border-t-primary">
              <CardContent>
                <p className="text-xs text-muted-foreground">Monthly Salary</p>
                <p className="mt-1 text-lg font-semibold">{formatCurrency(structure?.monthlySalary || 0)}</p>
              </CardContent>
            </Card>
            <Card size="sm" className="border-t-2 border-t-info">
              <CardContent>
                <p className="text-xs text-muted-foreground">Advance Outstanding</p>
                <p className="mt-1 text-lg font-semibold text-info">{formatCurrency(outstandingAdvance)}</p>
              </CardContent>
            </Card>
            <Card size="sm" className="col-span-2 border-t-2 border-t-warning sm:col-span-1">
              <CardContent>
                <p className="text-xs text-muted-foreground">Pending Salary</p>
                <p className="mt-1 text-lg font-semibold text-warning">{formatCurrency(pendingFromLastPayroll)}</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Staff Details</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-3">
                <div>
                  <dt className="text-muted-foreground">Phone</dt>
                  <dd className="font-medium">{teacher.phone || "-"}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Email</dt>
                  <dd className="font-medium">{teacher.email || "-"}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Joining Date</dt>
                  <dd className="font-medium">{formatDate(teacher.joiningDate)}</dd>
                </div>
                <div className="col-span-2 sm:col-span-3">
                  <dt className="text-muted-foreground">Address</dt>
                  <dd className="font-medium">{teacher.address || "-"}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          <div id="history" className="space-y-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="font-heading text-base font-medium">Salary & Advance History</h2>
              <TeacherHistoryFilter />
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Generate</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="mb-4">
                    <p className="text-xs text-muted-foreground">Generated · {historyRangeLabel}</p>
                    <p className="mt-1 text-lg font-semibold text-info">{formatCurrency(totalGenerated)}</p>
                  </div>

                  {filteredGenerateEntries.length === 0 ? (
                    <p className="py-6 text-center text-sm text-muted-foreground">
                      {isFiltered ? `No salary generated for ${historyRangeLabel}.` : "No salary generated yet."}
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {filteredGenerateEntries.map((entry) => (
                        <Link
                          key={`salary-${entry.id}`}
                          href={`/payroll/${id}?month=${entry.month}&year=${entry.year}`}
                          className="flex items-center justify-between gap-3 rounded-lg border border-border p-3 text-sm transition-colors hover:bg-accent/50"
                        >
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge variant="info">Salary</Badge>
                              <span className="text-xs text-muted-foreground">{MONTH_NAMES[entry.month - 1]} {entry.year}</span>
                            </div>
                            <p className="mt-1 font-medium">{formatCurrency(entry.amount)}</p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Paid</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="mb-4">
                    <p className="text-xs text-muted-foreground">Paid · {historyRangeLabel}</p>
                    <p className="mt-1 text-lg font-semibold text-success">{formatCurrency(totalPaid)}</p>
                  </div>

                  {filteredPaidEntries.length === 0 ? (
                    <p className="py-6 text-center text-sm text-muted-foreground">
                      {isFiltered ? `No advance or payment activity for ${historyRangeLabel}.` : "No advance or payment activity yet."}
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {filteredPaidEntries.map((entry) =>
                        entry.kind === "advance" ? (
                          <Link
                            key={`advance-${entry.id}`}
                            href={`/advance-payments/${id}`}
                            className="flex items-center justify-between gap-3 rounded-lg border border-border p-3 text-sm transition-colors hover:bg-accent/50"
                          >
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <Badge variant="warning">Advance</Badge>
                                <span className="text-xs text-muted-foreground">{formatDate(entry.date)}</span>
                              </div>
                              <p className="mt-1 font-medium">{formatCurrency(entry.amount)}</p>
                              {entry.note && <p className="truncate text-xs text-muted-foreground">{entry.note}</p>}
                            </div>
                          </Link>
                        ) : (
                          <div
                            key={`payment-${entry.id}`}
                            className="flex items-center justify-between gap-3 rounded-lg border border-border p-3 text-sm"
                          >
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <Badge variant="success">Payment</Badge>
                                <span className="text-xs text-muted-foreground">{formatDate(entry.date)} · {entry.mode}</span>
                              </div>
                              <p className="mt-1 font-medium">{formatCurrency(entry.amount)}</p>
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Payroll</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full justify-start" render={<Link href={`/payroll/${id}`}><CircleDollarSign /> Payroll</Link>} />
              <Button variant="outline" className="w-full justify-start" render={<Link href={`/salary-structure/${id}`}><TrendingUp /> Salary Structure</Link>} />
              <Button variant="outline" className="w-full justify-start" render={<Link href={`/advance-payments/${id}`}><HandCoins /> Advance Payments</Link>} />
              <Button variant="outline" className="w-full justify-start" render={<Link href={`/salary-history/${id}`}><History /> Salary History</Link>} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
