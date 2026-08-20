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

  const { standard, totalDue, students } = group;

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

      <Card className="mb-6 border-t-2 border-t-destructive">
        <CardContent>
          <p className="text-xs text-muted-foreground">Total Pending — Standard {standard.name}</p>
          <p className="mt-1 text-3xl font-bold text-destructive">{formatCurrency(totalDue)}</p>
        </CardContent>
      </Card>

      <Card className="overflow-hidden py-0">
        {students.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-muted-foreground">
            No pending fees in this standard.
          </p>
        ) : (
          <div className="divide-y divide-border">
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
                <span className="shrink-0 font-semibold text-destructive">
                  {formatCurrency(s.due)}
                </span>
              </Link>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
