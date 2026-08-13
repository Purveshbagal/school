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
import { BusesDateFilter } from "./buses-date-filter";
import { BusesViewTabs } from "./buses-view-tabs";
import { deleteBusAction, deleteBusExpenseAction } from "@/app/actions/buses";
import { Bus as BusIcon, Fuel, Send, Pencil } from "lucide-react";
import type { Prisma } from "@/generated/prisma/client";

export default async function BusesPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; from?: string; to?: string; view?: string }>;
}) {
  const { range, from, to, view } = await searchParams;
  const { start, end } = resolveDateRange(range, from, to);
  const isFiltered = Boolean(start && end);
  const rangeLabel = RANGE_OPTIONS.find((o) => o.value === (range || "all"))?.label || "All";
  const activeView = view === "vehicles" ? "vehicles" : "payments";

  const expenseWhere: Prisma.BusExpenseWhereInput = isFiltered
    ? { date: { gte: start, lte: end } }
    : {};

  const [buses, expenseTotals, grandTotal] = await Promise.all([
    prisma.bus.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.busExpense.groupBy({
      by: ["busId"],
      where: expenseWhere,
      _sum: { amount: true },
    }),
    prisma.busExpense.aggregate({ where: expenseWhere, _sum: { amount: true } }),
  ]);

  const expenseByBus = new Map(expenseTotals.map((e) => [e.busId, e._sum.amount || 0]));

  const payments =
    activeView === "payments"
      ? await prisma.busExpense.findMany({
          where: expenseWhere,
          include: { bus: true },
          orderBy: { date: "desc" },
          take: isFiltered ? undefined : 50,
        })
      : [];

  return (
    <div>
      <PageHeader
        title="School Bus"
        description={`${buses.length} bus${buses.length === 1 ? "" : "es"} registered`}
        actions={
          <>
            <Button variant="outline" render={<Link href="/buses/send" />}>
              <Send /> Send Amount
            </Button>
            <Button render={<Link href="/buses/new" />}>
              <BusIcon /> Add Bus
            </Button>
          </>
        }
      />

      <Card className="mb-6 border-t-2 border-t-destructive">
        <CardContent>
          <p className="text-xs text-muted-foreground">Total Diesel Expense · {rangeLabel}</p>
          <p className="mt-1 text-3xl font-bold text-destructive">
            {formatCurrency(grandTotal._sum.amount || 0)}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <BusesViewTabs />
          <BusesDateFilter />

          {activeView === "payments" ? (
            payments.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                {isFiltered
                  ? `No diesel payments found for ${rangeLabel}.`
                  : 'No payments recorded yet. Click "Send Amount" to record one.'}
              </p>
            ) : (
              <>
                {/* Mobile card list */}
                <div className="space-y-2.5 md:hidden">
                  {payments.map((p) => (
                    <div key={p.id} className="rounded-lg border border-border p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-medium">{p.bus.vehicleNumber}</p>
                          <p className="text-xs text-muted-foreground">{formatDate(p.date)}</p>
                        </div>
                        <span className="text-sm font-semibold text-destructive">
                          {formatCurrency(p.amount)}
                        </span>
                      </div>
                      {p.remarks && (
                        <p className="mt-1.5 truncate text-xs text-muted-foreground">{p.remarks}</p>
                      )}
                      <div className="mt-2 flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          render={<Link href={`/buses/expenses/${p.id}/edit`}><Pencil /></Link>}
                        />
                        <DeleteButton
                          action={deleteBusExpenseAction}
                          hiddenFields={{ id: p.id, busId: p.busId }}
                          confirmMessage={`Delete this expense of ${formatCurrency(p.amount)}? This cannot be undone.`}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop table */}
                <Table className="hidden md:table">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Vehicle Number</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Liters</TableHead>
                      <TableHead>Remarks</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell>{formatDate(p.date)}</TableCell>
                        <TableCell className="font-medium">
                          <Link href={`/buses/${p.busId}`} className="hover:text-primary hover:underline">
                            {p.bus.vehicleNumber}
                          </Link>
                        </TableCell>
                        <TableCell className="font-medium text-destructive">
                          {formatCurrency(p.amount)}
                        </TableCell>
                        <TableCell>{p.liters ? `${p.liters} L` : "-"}</TableCell>
                        <TableCell className="text-muted-foreground">{p.remarks || "-"}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              render={<Link href={`/buses/expenses/${p.id}/edit`}><Pencil /></Link>}
                            />
                            <DeleteButton
                              action={deleteBusExpenseAction}
                              hiddenFields={{ id: p.id, busId: p.busId }}
                              confirmMessage={`Delete this expense of ${formatCurrency(p.amount)}? This cannot be undone.`}
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </>
            )
          ) : buses.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No buses added yet. Click &quot;Add Bus&quot; to register one.
            </p>
          ) : (
            <>
              {/* Mobile card list */}
              <div className="space-y-3 md:hidden">
                {buses.map((b) => (
                  <div key={b.id} className="rounded-xl border border-border p-3.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <Link href={`/buses/${b.id}`} className="font-medium hover:text-primary hover:underline">
                          {b.vehicleNumber}
                        </Link>
                        <p className="mt-0.5 text-xs text-muted-foreground">{b.driverName || "No driver assigned"}</p>
                      </div>
                      <Badge variant={b.status === "ACTIVE" ? "success" : "outline"} className="shrink-0">
                        {b.status}
                      </Badge>
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Fuel className="h-3.5 w-3.5" /> {rangeLabel}
                      </div>
                      <span className="font-semibold text-destructive">
                        {formatCurrency(expenseByBus.get(b.id) || 0)}
                      </span>
                    </div>
                    <div className="mt-3 flex items-center justify-end gap-1.5">
                      <Button variant="outline" size="sm" render={<Link href={`/buses/${b.id}`}>View</Link>} />
                      <DeleteButton
                        action={deleteBusAction}
                        hiddenFields={{ id: b.id }}
                        confirmMessage={`Delete ${b.vehicleNumber}? This will also delete all of its expense records. This cannot be undone.`}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop table */}
              <Table className="hidden md:table">
                <TableHeader>
                  <TableRow>
                    <TableHead>Vehicle Number</TableHead>
                    <TableHead>Driver</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>{`Expense · ${rangeLabel}`}</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {buses.map((b) => (
                    <TableRow key={b.id}>
                      <TableCell className="font-medium">
                        <Link href={`/buses/${b.id}`} className="hover:text-primary hover:underline">
                          {b.vehicleNumber}
                        </Link>
                      </TableCell>
                      <TableCell>{b.driverName || "-"}</TableCell>
                      <TableCell>{b.phone || "-"}</TableCell>
                      <TableCell className="font-medium text-destructive">
                        {formatCurrency(expenseByBus.get(b.id) || 0)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={b.status === "ACTIVE" ? "success" : "outline"}>
                          {b.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1.5">
                          <Button variant="outline" size="sm" render={<Link href={`/buses/${b.id}`}>View</Link>} />
                          <DeleteButton
                            action={deleteBusAction}
                            hiddenFields={{ id: b.id }}
                            confirmMessage={`Delete ${b.vehicleNumber}? This will also delete all of its expense records. This cannot be undone.`}
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
