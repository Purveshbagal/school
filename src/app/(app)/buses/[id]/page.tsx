import Link from "next/link";
import { notFound } from "next/navigation";
import { getBusExpenseSummary } from "@/lib/bus";
import { resolveDateRange, RANGE_OPTIONS } from "@/lib/date-ranges";
import { BusesDateFilter } from "../buses-date-filter";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { formatCurrency, formatDate, formatDateInput } from "@/lib/utils";
import { ExpenseForm } from "./expense-form";
import { deleteBusAction, deleteBusExpenseAction } from "@/app/actions/buses";
import { Pencil, Fuel } from "lucide-react";

export default async function BusDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ range?: string; from?: string; to?: string }>;
}) {
  const { id } = await params;
  const { range, from, to } = await searchParams;
  const { start, end } = resolveDateRange(range, from, to);
  const isFiltered = Boolean(start && end);
  const rangeLabel = RANGE_OPTIONS.find((o) => o.value === (range || "all"))?.label || "All";

  const summary = await getBusExpenseSummary(id, { start, end });
  if (!summary) notFound();

  const { bus, expenses, totalExpense } = summary;
  const totalLiters = expenses.reduce((sum, e) => sum + (e.liters || 0), 0);

  return (
    <div>
      <PageHeader
        title={bus.vehicleNumber}
        description={bus.driverName ? `Driver: ${bus.driverName}` : "School Bus"}
        actions={
          <>
            <Button variant="outline" render={<Link href={`/buses/${id}/edit`}><Pencil /> Edit</Link>} />
            <DeleteButton
              action={deleteBusAction}
              hiddenFields={{ id }}
              confirmMessage={`Delete ${bus.vehicleNumber}? This will also delete all of its expense records. This cannot be undone.`}
              label="Delete"
              size="default"
              className="border border-transparent hover:border-destructive/20"
            />
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="min-w-0 space-y-6 lg:col-span-2">
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <Card size="sm" className="border-t-2 border-t-destructive">
              <CardContent>
                <p className="text-xs text-muted-foreground">Diesel Expense · {rangeLabel}</p>
                <p className="mt-1 text-lg font-semibold text-destructive">
                  {formatCurrency(totalExpense)}
                </p>
              </CardContent>
            </Card>
            <Card size="sm" className="border-t-2 border-t-info">
              <CardContent>
                <p className="text-xs text-muted-foreground">Liters Filled · {rangeLabel}</p>
                <p className="mt-1 text-lg font-semibold text-info">
                  {totalLiters ? `${totalLiters.toFixed(2)} L` : "-"}
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Bus Details</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-3">
                <div>
                  <dt className="text-muted-foreground">Vehicle Number</dt>
                  <dd className="font-medium">{bus.vehicleNumber}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Driver Name</dt>
                  <dd className="font-medium">{bus.driverName || "-"}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Driver Phone</dt>
                  <dd className="font-medium">{bus.phone || "-"}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Seating Capacity</dt>
                  <dd className="font-medium">{bus.capacity ?? "-"}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Status</dt>
                  <dd>
                    <Badge variant={bus.status === "ACTIVE" ? "success" : "outline"}>
                      {bus.status}
                    </Badge>
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Diesel / Expense History</CardTitle>
            </CardHeader>
            <CardContent>
              <BusesDateFilter basePath={`/buses/${id}`} />

              {expenses.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  {isFiltered
                    ? `No expenses found for ${rangeLabel}.`
                    : "No expenses recorded yet."}
                </p>
              ) : (
                <>
                  {/* Mobile card list */}
                  <div className="space-y-2.5 md:hidden">
                    {expenses.map((e) => (
                      <div key={e.id} className="rounded-lg border border-border p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-medium">{formatCurrency(e.amount)}</p>
                            <p className="mt-0.5 text-xs text-muted-foreground">{formatDate(e.date)}</p>
                          </div>
                          {e.liters ? <Badge variant="outline">{e.liters} L</Badge> : null}
                        </div>
                        {e.remarks && (
                          <p className="mt-1.5 truncate text-xs text-muted-foreground">{e.remarks}</p>
                        )}
                        <div className="mt-2 flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            render={<Link href={`/buses/expenses/${e.id}/edit`}><Pencil /></Link>}
                          />
                          <DeleteButton
                            action={deleteBusExpenseAction}
                            hiddenFields={{ id: e.id, busId: id }}
                            confirmMessage={`Delete this expense of ${formatCurrency(e.amount)}? This cannot be undone.`}
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
                        <TableHead>Amount</TableHead>
                        <TableHead>Liters</TableHead>
                        <TableHead>Remarks</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {expenses.map((e) => (
                        <TableRow key={e.id}>
                          <TableCell>{formatDate(e.date)}</TableCell>
                          <TableCell className="font-medium">{formatCurrency(e.amount)}</TableCell>
                          <TableCell>{e.liters ? `${e.liters} L` : "-"}</TableCell>
                          <TableCell className="text-muted-foreground">{e.remarks || "-"}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                render={<Link href={`/buses/expenses/${e.id}/edit`}><Pencil /></Link>}
                              />
                              <DeleteButton
                                action={deleteBusExpenseAction}
                                hiddenFields={{ id: e.id, busId: id }}
                                confirmMessage={`Delete this expense of ${formatCurrency(e.amount)}? This cannot be undone.`}
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

        <div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Fuel className="h-4 w-4" /> Add Diesel Expense
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ExpenseForm busId={id} today={formatDateInput(new Date())} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
