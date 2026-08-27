import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { AddInstallmentForm } from "./add-installment-form";
import { SkipInstallmentButton } from "./skip-installment-button";
import { formatCurrency, formatDate } from "@/lib/utils";
import { MONTH_NAMES, nextPeriod } from "@/lib/payroll-engine";
import { deleteAdvanceInstallmentAction } from "@/app/actions/payroll/advance-payments";
import { ArrowLeft, FileText } from "lucide-react";

export default async function AdvanceInstallmentSchedulePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const advance = await prisma.advancePayment.findUnique({
    where: { id },
    include: { teacher: true },
  });
  if (!advance || advance.deletedAt) notFound();

  const installments = await prisma.advanceInstallment.findMany({
    where: { advancePaymentId: id, deletedAt: null },
    orderBy: [{ year: "asc" }, { month: "asc" }],
  });

  const payrollIds = installments.map((i) => i.payrollId).filter((x): x is string => Boolean(x));
  const payrolls = payrollIds.length
    ? await prisma.payroll.findMany({ where: { id: { in: payrollIds } }, select: { id: true, invoiceNo: true, locked: true } })
    : [];
  const invoiceById = new Map(payrolls.map((p) => [p.id, p.invoiceNo]));
  const lockedPayrollIds = new Set(payrolls.filter((p) => p.locked).map((p) => p.id));

  const last = installments[installments.length - 1];
  const defaultPeriod = last ? nextPeriod(last.month, last.year) : { month: new Date().getMonth() + 1, year: new Date().getFullYear() };

  const totalScheduled = installments.reduce((s, i) => s + i.amount, 0);
  const totalApplied = installments.reduce((s, i) => s + i.appliedAmount, 0);

  function skipConfirm(i: (typeof installments)[number]) {
    const label = `${MONTH_NAMES[i.month - 1]} ${i.year}`;
    return i.appliedAmount > 0
      ? `${label}'s deduction of ${formatCurrency(i.amount)} has already been taken from that month's salary — undo it and move it to the end of the schedule instead?`
      : `Skip the ${label} installment of ${formatCurrency(i.amount)}? It will move to the end of the schedule instead.`;
  }
  function deleteConfirm(i: (typeof installments)[number]) {
    const label = `${MONTH_NAMES[i.month - 1]} ${i.year}`;
    return i.appliedAmount > 0
      ? `${label}'s deduction of ${formatCurrency(i.amount)} has already been taken from that month's salary — undo it and remove this installment entirely?`
      : `Remove the ${label} installment of ${formatCurrency(i.amount)}?`;
  }

  return (
    <div>
      <PageHeader
        title={`${advance.teacher.name} — EMI Schedule`}
        description={`Advance of ${formatCurrency(advance.amount)} given on ${formatDate(advance.date)}${advance.note ? ` — ${advance.note}` : ""}`}
        actions={
          <Button variant="outline" size="sm" render={<Link href={`/advance-payments/${advance.teacherId}`}>Back</Link>}>
            <ArrowLeft /> Back
          </Button>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4">
        <Card className="border-t-2 border-t-info">
          <CardContent>
            <p className="text-xs text-muted-foreground">Scheduled</p>
            <p className="mt-1 text-2xl font-bold text-info">{formatCurrency(totalScheduled)}</p>
          </CardContent>
        </Card>
        <Card className="border-t-2 border-t-success">
          <CardContent>
            <p className="text-xs text-muted-foreground">Deducted so far</p>
            <p className="mt-1 text-2xl font-bold text-success">{formatCurrency(totalApplied)}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Monthly Deduction Schedule</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {installments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No installments scheduled.</p>
          ) : (
            <>
              <div className="space-y-2.5 md:hidden">
                {installments.map((i) => (
                  <div key={i.id} className="rounded-lg border border-border p-3 text-sm">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium">{MONTH_NAMES[i.month - 1]} {i.year}</p>
                      <span className="font-semibold">{formatCurrency(i.amount)}</span>
                    </div>
                    <div className="mt-1.5 flex items-center justify-between gap-1.5">
                      <div className="flex items-center gap-1.5">
                        <Badge variant={i.status === "DEDUCTED" ? "success" : "outline"}>{i.status}</Badge>
                        {i.appliedAmount > 0 && i.status !== "DEDUCTED" && (
                          <span className="text-xs text-muted-foreground">{formatCurrency(i.appliedAmount)} applied</span>
                        )}
                        {i.payrollId && invoiceById.get(i.payrollId) && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <FileText className="h-3 w-3" /> {invoiceById.get(i.payrollId)}
                          </span>
                        )}
                      </div>
                      {i.payrollId && lockedPayrollIds.has(i.payrollId) ? (
                        <span className="text-xs text-muted-foreground">Locked</span>
                      ) : (
                        <div className="flex items-center">
                          <SkipInstallmentButton id={i.id} teacherId={advance.teacherId} confirmMessage={skipConfirm(i)} />
                          <DeleteButton
                            action={deleteAdvanceInstallmentAction}
                            hiddenFields={{ id: i.id, teacherId: advance.teacherId }}
                            confirmMessage={deleteConfirm(i)}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <Table className="hidden md:table">
                <TableHeader>
                  <TableRow>
                    <TableHead>Month</TableHead>
                    <TableHead>Scheduled</TableHead>
                    <TableHead>Applied</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Payroll</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {installments.map((i) => (
                    <TableRow key={i.id}>
                      <TableCell className="font-medium">{MONTH_NAMES[i.month - 1]} {i.year}</TableCell>
                      <TableCell>{formatCurrency(i.amount)}</TableCell>
                      <TableCell>{formatCurrency(i.appliedAmount)}</TableCell>
                      <TableCell>
                        <Badge variant={i.status === "DEDUCTED" ? "success" : "outline"}>{i.status}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {i.payrollId ? (
                          <Link href={`/payroll/${advance.teacherId}?month=${i.month}&year=${i.year}`} className="hover:text-primary hover:underline">
                            {invoiceById.get(i.payrollId) || "View"}
                          </Link>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {i.payrollId && lockedPayrollIds.has(i.payrollId) ? (
                          <span className="text-xs text-muted-foreground">Locked</span>
                        ) : (
                          <div className="flex items-center justify-end">
                            <SkipInstallmentButton id={i.id} teacherId={advance.teacherId} confirmMessage={skipConfirm(i)} />
                            <DeleteButton
                              action={deleteAdvanceInstallmentAction}
                              hiddenFields={{ id: i.id, teacherId: advance.teacherId }}
                              confirmMessage={deleteConfirm(i)}
                            />
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </>
          )}

          <AddInstallmentForm
            advancePaymentId={id}
            teacherId={advance.teacherId}
            defaultMonth={defaultPeriod.month}
            defaultYear={defaultPeriod.year}
          />
        </CardContent>
      </Card>
    </div>
  );
}
