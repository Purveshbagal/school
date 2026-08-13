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
import { DeleteButton } from "@/components/delete-button";
import { formatCurrency, formatDate } from "@/lib/utils";
import { resolveDateRange, RANGE_OPTIONS } from "@/lib/date-ranges";
import { PaymentsDateFilter } from "./payments-date-filter";
import { deletePaymentAction } from "@/app/actions/payments";
import { Wallet, Printer, Pencil } from "lucide-react";
import type { Prisma } from "@/generated/prisma/client";

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; from?: string; to?: string }>;
}) {
  const { range, from, to } = await searchParams;
  const { start, end } = resolveDateRange(range, from, to);
  const isFiltered = Boolean(start && end);

  const where: Prisma.FeePaymentWhereInput = isFiltered
    ? { paymentDate: { gte: start, lte: end } }
    : {};

  const [payments, totalCollected] = await Promise.all([
    prisma.feePayment.findMany({
      where,
      include: { student: { include: { standard: true } } },
      orderBy: { createdAt: "desc" },
      ...(isFiltered ? {} : { take: 50 }),
    }),
    prisma.feePayment.aggregate({ where, _sum: { amount: true } }),
  ]);

  const rangeLabel = RANGE_OPTIONS.find((o) => o.value === (range || "all"))?.label || "All";

  return (
    <div>
      <PageHeader
        title="Payments"
        description={
          isFiltered
            ? `${payments.length} payment${payments.length === 1 ? "" : "s"} · ${rangeLabel}`
            : `${payments.length} recent payment${payments.length === 1 ? "" : "s"}`
        }
        actions={
          <Button render={<Link href="/payments/new" />}>
            <Wallet /> Payment In
          </Button>
        }
      />

      <Card className="mb-6 border-t-2 border-t-success">
        <CardContent>
          <p className="text-xs text-muted-foreground">Total Collected Amount · {rangeLabel}</p>
          <p className="mt-1 text-3xl font-bold text-success">
            {formatCurrency(totalCollected._sum.amount || 0)}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <PaymentsDateFilter />

          {payments.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              {isFiltered
                ? `No payments found for ${rangeLabel}.`
                : 'No payments recorded yet. Click "Payment In" to record one.'}
            </p>
          ) : (
            <>
              {/* Mobile card list */}
              <div className="space-y-2.5 md:hidden">
                {payments.map((p) => (
                  <div key={p.id} className="rounded-lg border border-border p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium">{p.student.name}</p>
                        <p className="font-mono text-xs text-muted-foreground">{p.receiptNo}</p>
                      </div>
                      <Badge variant="outline">{p.mode}</Badge>
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <p className="text-xs text-muted-foreground">{formatDate(p.paymentDate)}</p>
                      <p className="text-sm font-semibold">{formatCurrency(p.amount)}</p>
                    </div>
                    <div className="mt-2 flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        render={
                          <Link href={`/receipts/${p.id}`} target="_blank">
                            <Printer />
                          </Link>
                        }
                      />
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        render={<Link href={`/payments/${p.id}/edit`}><Pencil /></Link>}
                      />
                      <DeleteButton
                        action={deletePaymentAction}
                        hiddenFields={{ id: p.id, studentId: p.studentId }}
                        confirmMessage={`Delete receipt ${p.receiptNo}? This cannot be undone.`}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop table */}
              <Table className="hidden md:table">
                <TableHeader>
                  <TableRow>
                    <TableHead>Receipt No</TableHead>
                    <TableHead>Student</TableHead>
                    <TableHead>Standard</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Mode</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-mono text-xs">{p.receiptNo}</TableCell>
                      <TableCell className="font-medium">
                        <Link href={`/students/${p.studentId}`} className="hover:text-primary hover:underline">
                          {p.student.name}
                        </Link>
                      </TableCell>
                      <TableCell>{p.student.standard.name}</TableCell>
                      <TableCell>{formatDate(p.paymentDate)}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{p.mode}</Badge>
                      </TableCell>
                      <TableCell className="font-medium">{formatCurrency(p.amount)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            render={
                              <Link href={`/receipts/${p.id}`} target="_blank">
                                <Printer />
                              </Link>
                            }
                          />
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            render={<Link href={`/payments/${p.id}/edit`}><Pencil /></Link>}
                          />
                          <DeleteButton
                            action={deletePaymentAction}
                            hiddenFields={{ id: p.id, studentId: p.studentId }}
                            confirmMessage={`Delete receipt ${p.receiptNo}? This cannot be undone.`}
                          />
                        </div>
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
