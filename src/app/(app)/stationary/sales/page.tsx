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
import { deleteSaleAction } from "@/app/actions/stationary";
import { ShoppingCart, CheckCircle2, Printer, Pencil, Wallet } from "lucide-react";

export default async function StationarySalesPage({
  searchParams,
}: {
  searchParams: Promise<{ sale?: string }>;
}) {
  const { sale: justCreatedId } = await searchParams;

  const [sales, justCreated] = await Promise.all([
    prisma.stationarySale.findMany({
      include: { student: true, payments: true },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    justCreatedId
      ? prisma.stationarySale.findUnique({
          where: { id: justCreatedId },
          include: { student: true, items: true, payments: true },
        })
      : null,
  ]);

  const justCreatedPaid = justCreated?.payments.reduce((sum, p) => sum + p.amount, 0) || 0;

  return (
    <div>
      <PageHeader
        title="Stationary Sale"
        description={`${sales.length} recent sale${sales.length === 1 ? "" : "s"}`}
        actions={
          <Button render={<Link href="/stationary/sales/new" />}>
            <ShoppingCart /> Sale
          </Button>
        }
      />

      {justCreated && (
        <Card className="mb-6 border-t-2 border-t-success">
          <CardContent>
            <div className="flex items-center gap-2 text-success">
              <CheckCircle2 className="h-4 w-4" />
              <p className="text-sm font-semibold">Sale Recorded — {justCreated.saleNo}</p>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {justCreated.student.name} · {justCreated.items.length} item
              {justCreated.items.length === 1 ? "" : "s"} ·{" "}
              <span className="font-semibold text-foreground">{formatCurrency(justCreated.totalAmount)}</span> ·{" "}
              {justCreated.paymentMode}
              {justCreated.totalAmount - justCreatedPaid > 0 && (
                <>
                  {" "}
                  ·{" "}
                  <span className="font-semibold text-destructive">
                    Pending {formatCurrency(justCreated.totalAmount - justCreatedPaid)}
                  </span>
                </>
              )}
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent>
          {sales.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No sales recorded yet. Click &quot;Sale&quot; to record one.
            </p>
          ) : (
            <>
              {/* Mobile card list */}
              <div className="space-y-2.5 md:hidden">
                {sales.map((s) => {
                  const paid = s.payments.reduce((sum, p) => sum + p.amount, 0);
                  const pending = s.totalAmount - paid;
                  return (
                  <div key={s.id} className="rounded-lg border border-border p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium">{s.student.name}</p>
                        <p className="font-mono text-xs text-muted-foreground">{s.saleNo}</p>
                      </div>
                      <Badge variant="outline">{s.paymentMode}</Badge>
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <p className="text-xs text-muted-foreground">{formatDate(s.saleDate)}</p>
                      <p className="text-sm font-semibold">{formatCurrency(s.totalAmount)}</p>
                    </div>
                    <div className="mt-1 flex items-center justify-end">
                      {pending > 0 ? (
                        <Badge variant="destructive">Pending {formatCurrency(pending)}</Badge>
                      ) : (
                        <Badge variant="success">Paid</Badge>
                      )}
                    </div>
                    <div className="mt-2 flex justify-end gap-1">
                      {pending > 0 && (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          render={<Link href={`/stationary/payments/new?sale=${s.id}`}><Wallet /></Link>}
                        />
                      )}
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        render={
                          <Link href={`/stationary-invoice/${s.id}`} target="_blank">
                            <Printer />
                          </Link>
                        }
                      />
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        render={<Link href={`/stationary/sales/${s.id}/edit`}><Pencil /></Link>}
                      />
                      <DeleteButton
                        action={deleteSaleAction}
                        hiddenFields={{ id: s.id }}
                        confirmMessage={`Delete sale ${s.saleNo}? This cannot be undone.`}
                      />
                    </div>
                  </div>
                  );
                })}
              </div>

              {/* Desktop table */}
              <Table className="hidden md:table">
                <TableHeader>
                  <TableRow>
                    <TableHead>Sale No</TableHead>
                    <TableHead>Student</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Pending</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sales.map((s) => {
                    const paid = s.payments.reduce((sum, p) => sum + p.amount, 0);
                    const pending = s.totalAmount - paid;
                    return (
                    <TableRow key={s.id}>
                      <TableCell className="font-mono text-xs">{s.saleNo}</TableCell>
                      <TableCell className="font-medium">
                        <Link href={`/students/${s.studentId}`} className="hover:text-primary hover:underline">
                          {s.student.name}
                        </Link>
                      </TableCell>
                      <TableCell>{formatDate(s.saleDate)}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{s.paymentMode}</Badge>
                      </TableCell>
                      <TableCell className="font-medium">{formatCurrency(s.totalAmount)}</TableCell>
                      <TableCell>
                        {pending > 0 ? (
                          <Badge variant="destructive">{formatCurrency(pending)}</Badge>
                        ) : (
                          <Badge variant="success">Paid</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {pending > 0 && (
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              render={<Link href={`/stationary/payments/new?sale=${s.id}`}><Wallet /></Link>}
                            />
                          )}
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            render={
                              <Link href={`/stationary-invoice/${s.id}`} target="_blank">
                                <Printer />
                              </Link>
                            }
                          />
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            render={<Link href={`/stationary/sales/${s.id}/edit`}><Pencil /></Link>}
                          />
                          <DeleteButton
                            action={deleteSaleAction}
                            hiddenFields={{ id: s.id }}
                            confirmMessage={`Delete sale ${s.saleNo}? This cannot be undone.`}
                          />
                        </div>
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
