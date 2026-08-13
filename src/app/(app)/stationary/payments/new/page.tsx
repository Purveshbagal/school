import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSaleSummary } from "@/lib/stationary";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StationaryPaymentForm } from "@/components/stationary-payment-form";
import { SaleSearch } from "./sale-search";
import { formatCurrency, formatDate, formatDateInput } from "@/lib/utils";
import { ArrowLeft } from "lucide-react";

export default async function NewStationaryPaymentPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; sale?: string }>;
}) {
  const { q, sale: saleId } = await searchParams;

  if (saleId) {
    const summary = await getSaleSummary(saleId);
    if (!summary) notFound();
    const { sale, totalPaid, due, advance } = summary;

    return (
      <div className="mx-auto max-w-lg">
        <PageHeader
          title="Stationary Payment In"
          description="Record a payment against this sale"
          actions={
            <Button
              variant="outline"
              size="sm"
              render={<Link href="/stationary/payments/new">Change Sale</Link>}
            >
              <ArrowLeft /> Change Sale
            </Button>
          }
        />

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-base">
              {sale.student.name}
              <Badge variant="outline">{sale.saleNo}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="-mt-2 mb-4 text-sm text-muted-foreground">
              {sale.student.admissionNo} · {formatDate(sale.saleDate)}
            </p>
            <StationaryPaymentForm
              saleId={sale.id}
              totalAmount={sale.totalAmount}
              totalPaid={totalPaid}
              due={due > 0 ? due : -advance}
              today={formatDateInput(new Date())}
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  const sales = await prisma.stationarySale.findMany({
    where: q
      ? {
          OR: [
            { saleNo: { contains: q, mode: "insensitive" } },
            { student: { name: { contains: q, mode: "insensitive" } } },
            { student: { admissionNo: { contains: q, mode: "insensitive" } } },
          ],
        }
      : {},
    include: { student: true, payments: true },
    orderBy: { saleDate: "desc" },
    take: 50,
  });

  const pendingSales = sales
    .map((sale) => {
      const totalPaid = sale.payments.reduce((sum, p) => sum + p.amount, 0);
      const due = Math.max(0, sale.totalAmount - totalPaid);
      return { sale, due };
    })
    .filter((s) => s.due > 0);

  return (
    <div className="mx-auto max-w-lg">
      <PageHeader
        title="Stationary Payment In"
        description="Search a sale with a pending balance"
        actions={
          <Button variant="outline" size="sm" render={<Link href="/stationary/payments">Cancel</Link>} />
        }
      />

      <Card>
        <CardContent>
          <SaleSearch initialQuery={q || ""} />

          {pendingSales.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              {q ? "No matching sales with a pending balance." : "No sales with a pending balance found."}
            </p>
          ) : (
            <div className="space-y-2">
              {pendingSales.map(({ sale, due }) => (
                <Link
                  key={sale.id}
                  href={`/stationary/payments/new?sale=${sale.id}`}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border p-3 transition hover:border-primary/50 hover:bg-accent/40"
                >
                  <div className="min-w-0">
                    <p className="font-medium">{sale.student.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {sale.saleNo} · {sale.student.admissionNo} · {formatDate(sale.saleDate)}
                    </p>
                  </div>
                  <Badge variant="destructive" className="shrink-0">
                    {formatCurrency(due)}
                  </Badge>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
