import Link from "next/link";
import { getPendingFeesReport } from "@/lib/fees";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { ChevronRight } from "lucide-react";

export default async function PendingFeesPage() {
  const { grandTotal, grandTotalStandard, grandTotalBus, groups } = await getPendingFeesReport();

  return (
    <div>
      <PageHeader title="Pending Fees" description="Standard-wise breakdown of outstanding fees" />

      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        <Card className="border-t-2 border-t-destructive">
          <CardContent>
            <p className="text-xs text-muted-foreground">Total Pending Amount</p>
            <p className="mt-1 text-3xl font-bold text-destructive">{formatCurrency(grandTotal)}</p>
          </CardContent>
        </Card>
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
          {groups.map(({ standard, totalDue, students }) => (
            <Link
              key={standard.id}
              href={`/pending-fees/${standard.id}`}
              className="flex items-center justify-between gap-3 px-4 py-3.5 transition hover:bg-accent/40"
            >
              <div className="flex items-center gap-2.5">
                <span className="font-medium">Standard {standard.name}</span>
                <Badge variant="outline">
                  {students.length} student{students.length === 1 ? "" : "s"} pending
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`font-semibold ${totalDue > 0 ? "text-destructive" : "text-muted-foreground"}`}
                >
                  {formatCurrency(totalDue)}
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
