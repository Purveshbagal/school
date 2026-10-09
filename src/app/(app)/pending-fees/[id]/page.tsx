import Link from "next/link";
import { notFound } from "next/navigation";
import { getPendingFeesReport } from "@/lib/fees";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { ArrowLeft } from "lucide-react";

export default async function PendingFeesByStandardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { groups } = await getPendingFeesReport();
  const group = groups.find((g) => g.standard.id === id);
  if (!group) notFound();

  const { standard, totalDue, totalPaid, students } = group;

  return (
    <div>
      <PageHeader
        title={`Standard ${standard.name} — Pending Fees`}
        description={`${students.length} student${students.length === 1 ? "" : "s"} with pending fees`}
        actions={
          <Button variant="outline" size="sm" render={<Link href="/pending-fees">Back</Link>}>
            <ArrowLeft /> Back
          </Button>
        }
      />

      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
        <Card className="border-t-2 border-t-destructive">
          <CardContent>
            <p className="text-xs text-muted-foreground">Total Pending — Standard {standard.name}</p>
            <p className="mt-1 text-3xl font-bold text-destructive">{formatCurrency(totalDue)}</p>
          </CardContent>
        </Card>
        <Card className="border-t-2 border-t-success">
          <CardContent>
            <p className="text-xs text-muted-foreground">Total Paid — Standard {standard.name}</p>
            <p className="mt-1 text-3xl font-bold text-success">{formatCurrency(totalPaid)}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="overflow-hidden py-0">
        {students.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-muted-foreground">
            No pending fees in this standard.
          </p>
        ) : (
          <div className="divide-y divide-border">
            <div className="flex items-center justify-between gap-3 bg-muted/50 px-4 py-2 text-xs font-medium text-muted-foreground">
              <span>Student</span>
              <div className="flex shrink-0 items-center gap-2">
                <span className="w-24 text-right sm:w-32">Pending</span>
                <span className="w-24 text-right sm:w-32">Paid</span>
              </div>
            </div>
            {students.map((s) => (
              <Link
                key={s.id}
                href={`/students/${s.id}`}
                className="flex items-center justify-between gap-3 px-4 py-3 transition hover:bg-accent/40"
              >
                <div className="min-w-0">
                  <p className="font-medium">{s.name}</p>
                  <p className="font-mono text-xs text-muted-foreground">{s.admissionNo}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {s.openingDue > 0 && <>Previous: {formatCurrency(s.openingDue)} · </>}
                    Student: {formatCurrency(s.standardDue)}
                    {s.busDue > 0 && <> · Bus: {formatCurrency(s.busDue)}</>}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2 text-sm sm:text-base">
                  <span className="w-24 text-right font-semibold text-destructive sm:w-32">
                    {formatCurrency(s.due)}
                  </span>
                  <span className="w-24 text-right font-semibold text-success sm:w-32">
                    {formatCurrency(s.paid)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
