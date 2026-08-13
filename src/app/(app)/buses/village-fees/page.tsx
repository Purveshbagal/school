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
import { formatCurrency } from "@/lib/utils";
import { VillageFeeForm } from "./village-fee-form";
import { MapPin } from "lucide-react";

export default async function VillageBusFeesPage() {
  const districts = await prisma.district.findMany({
    orderBy: { name: "asc" },
    include: {
      talukas: {
        orderBy: { name: "asc" },
        include: { villages: { orderBy: { name: "asc" } } },
      },
    },
  });

  const rows = districts.flatMap((d) =>
    d.talukas.flatMap((t) =>
      t.villages.map((v) => ({
        id: v.id,
        name: v.name,
        busFee: v.busFee,
        taluka: t.name,
        district: d.name,
      }))
    )
  );

  return (
    <div>
      <PageHeader
        title="Village Bus Fees"
        description="Set the bus fee per village — the admission form applies this automatically when School Bus is Yes"
      />

      <Card>
        <CardContent>
          {rows.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center text-sm text-muted-foreground">
              <MapPin className="h-8 w-8 text-muted-foreground/40" />
              <p>
                No villages set up yet. Add them under{" "}
                <Link href="/settings?tab=locations" className="text-primary underline">
                  Settings → Village Setting
                </Link>
                .
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-2.5 md:hidden">
                {rows.map((r) => (
                  <div key={r.id} className="rounded-lg border border-border p-3">
                    <p className="font-medium">{r.name}</p>
                    <p className="mb-2 text-xs text-muted-foreground">{r.taluka}, {r.district}</p>
                    <VillageFeeForm key={r.busFee} villageId={r.id} busFee={r.busFee} />
                  </div>
                ))}
              </div>

              <Table className="hidden md:table">
                <TableHeader>
                  <TableRow>
                    <TableHead>Village</TableHead>
                    <TableHead>Taluka</TableHead>
                    <TableHead>District</TableHead>
                    <TableHead>Current Bus Fee</TableHead>
                    <TableHead>Update</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.name}</TableCell>
                      <TableCell className="text-muted-foreground">{r.taluka}</TableCell>
                      <TableCell className="text-muted-foreground">{r.district}</TableCell>
                      <TableCell>{formatCurrency(r.busFee)}</TableCell>
                      <TableCell>
                        <VillageFeeForm key={r.busFee} villageId={r.id} busFee={r.busFee} />
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
