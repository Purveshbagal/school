import Link from "next/link";
import { getFeesOverview } from "@/lib/fees";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { IndianRupee, AlertCircle, ChevronRight } from "lucide-react";

export default async function FeesOverviewPage() {
  const { totalFees, totalCollected, totalPending } = await getFeesOverview();
  const collectedPct = totalFees > 0 ? Math.round((totalCollected / totalFees) * 100) : 0;

  return (
    <div>
      <PageHeader title="Fees Overview" description="Total fees owed by all active students" />

      <Card className="mb-6 border-t-2 border-t-success">
        <CardContent>
          <p className="text-xs text-muted-foreground">Total Fees · All Active Students</p>
          <p className="mt-1 text-3xl font-bold">{formatCurrency(totalFees)}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {collectedPct}% collected so far
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Link href="/payments" className="block">
          <Card className="border-t-2 border-t-primary transition-shadow hover:shadow-md">
            <CardContent className="flex items-start justify-between">
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Total Collection</p>
                <p className="mt-1 text-2xl font-semibold text-primary">
                  {formatCurrency(totalCollected)}
                </p>
                <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                  View payments <ChevronRight className="h-3 w-3" />
                </p>
              </div>
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <IndianRupee className="h-4.5 w-4.5" />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/pending-fees" className="block">
          <Card className="border-t-2 border-t-destructive transition-shadow hover:shadow-md">
            <CardContent className="flex items-start justify-between">
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Pending Fees</p>
                <p className="mt-1 text-2xl font-semibold text-destructive">
                  {formatCurrency(totalPending)}
                </p>
                <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                  View breakdown <ChevronRight className="h-3 w-3" />
                </p>
              </div>
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
                <AlertCircle className="h-4.5 w-4.5" />
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
