import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { resolveDateRange, RANGE_OPTIONS } from "@/lib/date-ranges";
import { AdvancePaymentsDateFilter } from "../advance-payments-date-filter";
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
import { formatCurrency, formatDate } from "@/lib/utils";
import { deleteAdvanceAction } from "@/app/actions/payroll/advance-payments";
import { ArrowLeft, Pencil } from "lucide-react";

export default async function TeacherAdvanceHistoryPage({
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

  const teacher = await prisma.teacher.findUnique({ where: { id } });
  if (!teacher) notFound();

  const allAdvances = await prisma.advancePayment.findMany({
    where: { teacherId: id, deletedAt: null },
    orderBy: { date: "desc" },
  });
  const advances = isFiltered ? allAdvances.filter((a) => a.date >= start! && a.date <= end!) : allAdvances;
  const totalGiven = advances.reduce((sum, a) => sum + a.amount, 0);
  const outstanding = allAdvances.reduce((sum, a) => (a.status !== "ADJUSTED" ? sum + (a.amount - a.adjustedAmount) : sum), 0);

  return (
    <div>
      <PageHeader
        title={teacher.name}
        description={teacher.designation || "Staff"}
        actions={
          <Button variant="outline" size="sm" render={<Link href="/advance-payments?view=staff">Back</Link>}>
            <ArrowLeft /> Back
          </Button>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4">
        <Card className="border-t-2 border-t-info">
          <CardContent>
            <p className="text-xs text-muted-foreground">Given · {rangeLabel}</p>
            <p className="mt-1 text-2xl font-bold text-info">{formatCurrency(totalGiven)}</p>
          </CardContent>
        </Card>
        <Card className="border-t-2 border-t-warning">
          <CardContent>
            <p className="text-xs text-muted-foreground">Outstanding (not yet applied)</p>
            <p className="mt-1 text-2xl font-bold text-warning">{formatCurrency(outstanding)}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Advance History</CardTitle>
        </CardHeader>
        <CardContent>
          <AdvancePaymentsDateFilter basePath={`/advance-payments/${id}`} />

          {advances.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              {isFiltered ? `No advances found for ${rangeLabel}.` : "No advances given yet."}
            </p>
          ) : (
            <>
              <div className="space-y-2.5 md:hidden">
                {advances.map((a) => (
                  <div key={a.id} className="rounded-lg border border-border p-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium">{formatCurrency(a.amount)}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(a.date)}</p>
                    </div>
                    <div className="mt-1.5 flex items-center gap-1.5">
                      <Badge variant={a.status === "ADJUSTED" ? "success" : a.status === "PARTIALLY_ADJUSTED" ? "warning" : "outline"}>
                        {a.status.replace("_", " ")}
                      </Badge>
                      {a.note && <p className="truncate text-xs text-muted-foreground">{a.note}</p>}
                    </div>
                    {a.status === "UNADJUSTED" && (
                      <div className="mt-2 flex justify-end gap-1">
                        <Button variant="ghost" size="icon-sm" render={<Link href={`/advance-payments/entries/${a.id}/edit`}><Pencil /></Link>} />
                        <DeleteButton
                          action={deleteAdvanceAction}
                          hiddenFields={{ id: a.id, teacherId: id }}
                          confirmMessage={`Delete this advance of ${formatCurrency(a.amount)}? This cannot be undone.`}
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
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Note</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {advances.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell>{formatDate(a.date)}</TableCell>
                      <TableCell className="font-medium">{formatCurrency(a.amount)}</TableCell>
                      <TableCell>
                        <Badge variant={a.status === "ADJUSTED" ? "success" : a.status === "PARTIALLY_ADJUSTED" ? "warning" : "outline"}>
                          {a.status.replace("_", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{a.note || "-"}</TableCell>
                      <TableCell className="text-right">
                        {a.status === "UNADJUSTED" && (
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon-sm" render={<Link href={`/advance-payments/entries/${a.id}/edit`}><Pencil /></Link>} />
                            <DeleteButton
                              action={deleteAdvanceAction}
                              hiddenFields={{ id: a.id, teacherId: id }}
                              confirmMessage={`Delete this advance of ${formatCurrency(a.amount)}? This cannot be undone.`}
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
        </CardContent>
      </Card>
    </div>
  );
}
