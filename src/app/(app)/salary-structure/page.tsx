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
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/utils";
import { TrendingUp } from "lucide-react";

export default async function SalaryStructurePage() {
  const teachers = await prisma.teacher.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      salaryStructures: {
        where: { status: "ACTIVE", deletedAt: null },
        orderBy: { effectiveFrom: "desc" },
        take: 1,
      },
    },
  });

  return (
    <div>
      <PageHeader
        title="Salary Structure"
        description="Current salary assigned to each teacher — revise here to keep a full history"
      />

      <Card>
        <CardContent>
          {teachers.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">No staff members added yet.</p>
          ) : (
            <>
              <div className="space-y-3 md:hidden">
                {teachers.map((t) => {
                  const structure = t.salaryStructures[0];
                  return (
                    <Link
                      key={t.id}
                      href={`/salary-structure/${t.id}`}
                      className="block rounded-xl border border-border p-3.5 transition hover:border-primary/50 hover:bg-accent/40"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-medium">{t.name}</p>
                          <p className="mt-0.5 text-xs text-muted-foreground">{t.designation || "Staff"}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">{formatCurrency(structure?.monthlySalary || 0)}</p>
                          <p className="text-xs text-muted-foreground">
                            {structure ? `since ${formatDate(structure.effectiveFrom)}` : "Not assigned"}
                          </p>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>

              <Table className="hidden md:table">
                <TableHeader>
                  <TableRow>
                    <TableHead>Staff Member</TableHead>
                    <TableHead>Designation</TableHead>
                    <TableHead>Current Salary</TableHead>
                    <TableHead>Effective From</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teachers.map((t) => {
                    const structure = t.salaryStructures[0];
                    return (
                      <TableRow key={t.id}>
                        <TableCell className="font-medium">
                          <Link href={`/salary-structure/${t.id}`} className="hover:text-primary hover:underline">
                            {t.name}
                          </Link>
                        </TableCell>
                        <TableCell>{t.designation || "-"}</TableCell>
                        <TableCell className="font-medium">{formatCurrency(structure?.monthlySalary || 0)}</TableCell>
                        <TableCell>{structure ? formatDate(structure.effectiveFrom) : "-"}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            render={<Link href={`/salary-structure/${t.id}/revise`}><TrendingUp /> Revise</Link>}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
