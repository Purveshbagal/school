import Link from "next/link";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
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
import { formatCurrency } from "@/lib/utils";
import { MONTH_NAMES } from "@/lib/payroll-engine";
import { Printer } from "lucide-react";

const STATUS_VARIANT: Record<string, "success" | "warning" | "destructive" | "outline"> = {
  PAID: "success",
  PARTIALLY_PAID: "warning",
  GENERATED: "destructive",
};

export default async function SalarySlipsPage() {
  const payrolls = await prisma.payroll.findMany({
    where: { deletedAt: null },
    include: { teacher: true },
    orderBy: [{ year: "desc" }, { month: "desc" }, { createdAt: "desc" }],
    take: 100,
  });

  return (
    <div>
      <PageHeader title="Salary Slips" description="All generated salary slips, most recent first" />

      <Card>
        <CardContent>
          {payrolls.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No salary slips generated yet. Generate one from the Payroll section.
            </p>
          ) : (
            <>
              <div className="space-y-2.5 md:hidden">
                {payrolls.map((p) => (
                  <Link
                    key={p.id}
                    href={`/salary-slips/${p.id}`}
                    target="_blank"
                    className="block rounded-lg border border-border p-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium">{p.teacher.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {MONTH_NAMES[p.month - 1]} {p.year} · {p.invoiceNo}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{formatCurrency(p.netPayable)}</p>
                        <Badge variant={STATUS_VARIANT[p.status] || "outline"}>{p.status.replace("_", " ")}</Badge>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>

              <Table className="hidden md:table">
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice No</TableHead>
                    <TableHead>Staff Member</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead>Net Payable</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payrolls.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-mono text-xs">{p.invoiceNo}</TableCell>
                      <TableCell className="font-medium">
                        <Link href={`/payroll/${p.teacherId}?month=${p.month}&year=${p.year}`} className="hover:text-primary hover:underline">
                          {p.teacher.name}
                        </Link>
                      </TableCell>
                      <TableCell>{MONTH_NAMES[p.month - 1]} {p.year}</TableCell>
                      <TableCell className="font-medium">{formatCurrency(p.netPayable)}</TableCell>
                      <TableCell>
                        <Badge variant={STATUS_VARIANT[p.status] || "outline"}>{p.status.replace("_", " ")}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          render={<Link href={`/salary-slips/${p.id}`} target="_blank"><Printer /> View</Link>}
                        />
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
