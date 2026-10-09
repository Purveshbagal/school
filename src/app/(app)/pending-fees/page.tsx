import Link from "next/link";
import { getPendingFeesReport } from "@/lib/fees";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { ChevronRight } from "lucide-react";

export default async function PendingFeesPage() {
  const { grandTotal, grandTotalOpening, grandTotalStandard, grandTotalBus, grandTotalPaid, groups } =
    await getPendingFeesReport();

  return (
    <div>
      <PageHeader title="Pending Fees" description="Standard-wise breakdown of outstanding fees" />

      <div className="mb-3 grid grid-cols-1 gap-3 sm:mb-4 sm:grid-cols-2 sm:gap-4">
        <Card className="border-t-2 border-t-destructive">
          <CardContent>
            <p className="text-xs text-muted-foreground">Total Pending Amount</p>
            <p className="mt-1 text-3xl font-bold text-destructive">{formatCurrency(grandTotal)}</p>
          </CardContent>
        </Card>
        <Card className="border-t-2 border-t-success">
          <CardContent>
            <p className="text-xs text-muted-foreground">Total Paid Amount</p>
            <p className="mt-1 text-3xl font-bold text-success">{formatCurrency(grandTotalPaid)}</p>
          </CardContent>
        </Card>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
        {grandTotalOpening > 0 && (
          <Card size="sm" className="border-t-2 border-t-amber-400">
            <CardContent>
              <p className="text-xs text-muted-foreground">Previous Year Pending</p>
              <p className="mt-1 text-lg font-semibold text-amber-600">
                {formatCurrency(grandTotalOpening)}
              </p>
            </CardContent>
          </Card>
        )}
        <Card size="sm" className="border-t-2 border-t-primary">
          <CardContent>
            <p className="text-xs text-muted-foreground">Student Fees Pending</p>
            <p className="mt-1 text-lg font-semibold">{formatCurrency(grandTotalStandard)}</p>
          </CardContent>
        </Card>
        <Card size="sm" className="border-t-2 border-t-orange-400">
          <CardContent>
            <p className="text-xs text-muted-foreground">Bus Fees Pending</p>
            <p className="mt-1 text-lg font-semibold text-orange-600">{formatCurrency(grandTotalBus)}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="overflow-hidden py-0">
        <div className="divide-y divide-border">
          <div className="flex items-center justify-between gap-3 bg-muted/50 px-4 py-2 text-xs font-medium text-muted-foreground">
            <span>Standard</span>
            <div className="flex shrink-0 items-center gap-2">
              <span className="w-24 text-right sm:w-32">Pending</span>
              <span className="w-24 text-right sm:w-32">Paid</span>
              <span className="w-4" />
            </div>
          </div>
          {groups.map(({ standard, totalDue, totalPaid, students }) => (
            <Link
              key={standard.id}
              href={`/pending-fees/${standard.id}`}
              className="flex items-center justify-between gap-3 px-4 py-3.5 transition hover:bg-accent/40"
            >
              <div className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1">
                <span className="font-medium">Standard {standard.name}</span>
                <Badge variant="outline">
                  {students.length} student{students.length === 1 ? "" : "s"} pending
                </Badge>
              </div>
              <div className="flex shrink-0 items-center gap-2 text-sm sm:text-base">
                <span
                  className={`w-24 text-right font-semibold sm:w-32 ${totalDue > 0 ? "text-destructive" : "text-muted-foreground"}`}
                >
                  {formatCurrency(totalDue)}
                </span>
                <span className="w-24 text-right font-semibold text-success sm:w-32">
                  {formatCurrency(totalPaid)}
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </div>
            </Link>
          ))}
        </div>
      </Card>
    </div>
  );
}
