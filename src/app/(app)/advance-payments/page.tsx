import Link from "next/link";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { DeleteButton } from "@/components/delete-button";
import { formatCurrency, formatDate } from "@/lib/utils";
import { resolveDateRange, RANGE_OPTIONS } from "@/lib/date-ranges";
import { AdvancePaymentsDateFilter } from "./advance-payments-date-filter";
import { AdvancePaymentsViewTabs } from "./advance-payments-view-tabs";
import { deleteAdvanceAction } from "@/app/actions/payroll/advance-payments";
import { Send, Pencil } from "lucide-react";
import type { Prisma } from "@/generated/prisma/client";

export default async function AdvancePaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; from?: string; to?: string; view?: string }>;
}) {
  const { range, from, to, view } = await searchParams;
  const { start, end } = resolveDateRange(range, from, to);
  const isFiltered = Boolean(start && end);
  const rangeLabel = RANGE_OPTIONS.find((o) => o.value === (range || "all"))?.label || "All";
  const activeView = view === "staff" ? "staff" : "payments";

  const advanceWhere: Prisma.AdvancePaymentWhereInput = {
    deletedAt: null,
    ...(isFiltered ? { date: { gte: start, lte: end } } : {}),
  };

  const [teachers, advanceTotals, grandTotal] = await Promise.all([
    prisma.teacher.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.advancePayment.groupBy({ by: ["teacherId"], where: advanceWhere, _sum: { amount: true } }),
    prisma.advancePayment.aggregate({ where: advanceWhere, _sum: { amount: true } }),
  ]);

  const givenByTeacher = new Map(advanceTotals.map((a) => [a.teacherId, a._sum.amount || 0]));

  const payments =
    activeView === "payments"
      ? await prisma.advancePayment.findMany({
          where: advanceWhere,
          include: { teacher: true },
          orderBy: { date: "desc" },
          take: isFiltered ? undefined : 50,
        })
      : [];

  return (
    <div>
      <PageHeader
        title="Advance Payments"
        description={`${teachers.length} staff member${teachers.length === 1 ? "" : "s"}`}
        actions={
          <Button render={<Link href="/advance-payments/send" />}>
            <Send /> Give Advance
          </Button>
        }
      />

      <Card className="mb-6 border-t-2 border-t-info">
        <CardContent>
          <p className="text-xs text-muted-foreground">Total Advances Given · {rangeLabel}</p>
          <p className="mt-1 text-3xl font-bold text-info">{formatCurrency(grandTotal._sum.amount || 0)}</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <AdvancePaymentsViewTabs />
          <AdvancePaymentsDateFilter />

          {activeView === "payments" ? (
            payments.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                {isFiltered ? `No advances found for ${rangeLabel}.` : 'No advances recorded yet. Click "Give Advance" to record one.'}
              </p>
            ) : (
              <>
                <div className="space-y-2.5 md:hidden">
                  {payments.map((p) => (
                    <div key={p.id} className="rounded-lg border border-border p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-medium">{p.teacher.name}</p>
                          <p className="text-xs text-muted-foreground">{formatDate(p.date)}</p>
                        </div>
                        <span className="text-sm font-semibold text-info">{formatCurrency(p.amount)}</span>
                      </div>
                      <div className="mt-1.5 flex items-center gap-1.5">
                        <Badge variant={p.status === "ADJUSTED" ? "success" : p.status === "PARTIALLY_ADJUSTED" ? "warning" : "outline"}>
                          {p.status.replace("_", " ")}
                        </Badge>
                        {p.note && <p className="truncate text-xs text-muted-foreground">{p.note}</p>}
                      </div>
                      {p.status === "UNADJUSTED" && (
                        <div className="mt-2 flex justify-end gap-1">
                          <Button variant="ghost" size="icon-sm" render={<Link href={`/advance-payments/entries/${p.id}/edit`}><Pencil /></Link>} />
                          <DeleteButton
                            action={deleteAdvanceAction}
                            hiddenFields={{ id: p.id, teacherId: p.teacherId }}
                            confirmMessage={`Delete this advance of ${formatCurrency(p.amount)}? This cannot be undone.`}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <Table className="hidden md:table">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Staff Member</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Note</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell>{formatDate(p.date)}</TableCell>
                        <TableCell className="font-medium">
                          <Link href={`/advance-payments/${p.teacherId}`} className="hover:text-primary hover:underline">
                            {p.teacher.name}
                          </Link>
                        </TableCell>
                        <TableCell className="font-medium text-info">{formatCurrency(p.amount)}</TableCell>
                        <TableCell>
                          <Badge variant={p.status === "ADJUSTED" ? "success" : p.status === "PARTIALLY_ADJUSTED" ? "warning" : "outline"}>
                            {p.status.replace("_", " ")}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{p.note || "-"}</TableCell>
                        <TableCell className="text-right">
                          {p.status === "UNADJUSTED" && (
                            <div className="flex justify-end gap-1">
                              <Button variant="ghost" size="icon-sm" render={<Link href={`/advance-payments/entries/${p.id}/edit`}><Pencil /></Link>} />
                              <DeleteButton
                                action={deleteAdvanceAction}
                                hiddenFields={{ id: p.id, teacherId: p.teacherId }}
                                confirmMessage={`Delete this advance of ${formatCurrency(p.amount)}? This cannot be undone.`}
                              />
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </>
            )
          ) : teachers.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">No staff members added yet.</p>
          ) : (
            <>
              <div className="space-y-3 md:hidden">
                {teachers.map((t) => (
                  <Link
                    key={t.id}
                    href={`/advance-payments/${t.id}`}
                    className="block rounded-xl border border-border p-3.5 transition hover:border-primary/50 hover:bg-accent/40"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium">{t.name}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">{t.designation || "Staff"}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">{rangeLabel}</p>
                        <p className="font-semibold text-info">{formatCurrency(givenByTeacher.get(t.id) || 0)}</p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>

              <Table className="hidden md:table">
                <TableHeader>
                  <TableRow>
                    <TableHead>Staff Member</TableHead>
                    <TableHead>Designation</TableHead>
                    <TableHead>{`Given · ${rangeLabel}`}</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teachers.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="font-medium">
                        <Link href={`/advance-payments/${t.id}`} className="hover:text-primary hover:underline">
                          {t.name}
                        </Link>
                      </TableCell>
                      <TableCell>{t.designation || "-"}</TableCell>
                      <TableCell className="font-medium text-info">{formatCurrency(givenByTeacher.get(t.id) || 0)}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" render={<Link href={`/advance-payments/${t.id}`}>View</Link>} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
