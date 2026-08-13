import Link from "next/link";
import { getPendingStationaryReport } from "@/lib/stationary";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Wallet } from "lucide-react";

export default async function PendingStationaryPage() {
  const { grandTotal, pending } = await getPendingStationaryReport();

  return (
    <div>
      <PageHeader title="Pending Stationary Payments" description="Sales with an outstanding balance" />

      <Card className="mb-6 border-t-2 border-t-destructive">
        <CardContent>
          <p className="text-xs text-muted-foreground">Total Pending Amount</p>
          <p className="mt-1 text-3xl font-bold text-destructive">{formatCurrency(grandTotal)}</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          {pending.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No pending stationary payments. Everything is settled.
            </p>
          ) : (
            <div className="divide-y divide-border">
              {pending.map(({ sale, due }) => (
                <div key={sale.id} className="flex items-center justify-between gap-3 py-3.5">
                  <div className="min-w-0">
                    <p className="font-medium">{sale.student.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {sale.saleNo} · {sale.student.admissionNo} · {formatDate(sale.saleDate)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="destructive">{formatCurrency(due)}</Badge>
                    <Button
                      size="sm"
                      variant="outline"
                      render={<Link href={`/stationary/payments/new?sale=${sale.id}`} />}
                    >
                      <Wallet /> Pay
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
