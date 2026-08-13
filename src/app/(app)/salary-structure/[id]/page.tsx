import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { ArrowLeft, TrendingUp } from "lucide-react";

export default async function TeacherSalaryStructurePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const teacher = await prisma.teacher.findUnique({ where: { id } });
  if (!teacher) notFound();

  const [activeStructure, revisions] = await Promise.all([
    prisma.salaryStructure.findFirst({
      where: { teacherId: id, status: "ACTIVE", deletedAt: null },
      orderBy: { effectiveFrom: "desc" },
    }),
    prisma.salaryRevision.findMany({
      where: { teacherId: id, deletedAt: null },
      orderBy: { effectiveFrom: "desc" },
    }),
  ]);

  return (
    <div>
      <PageHeader
        title={teacher.name}
        description={teacher.designation || "Staff"}
        actions={
          <>
            <Button variant="outline" size="sm" render={<Link href="/salary-structure">Back</Link>}>
              <ArrowLeft /> Back
            </Button>
            <Button size="sm" render={<Link href={`/salary-structure/${id}/revise`}><TrendingUp /> Revise Salary</Link>} />
          </>
        }
      />

      <Card className="mb-6 border-t-2 border-t-primary">
        <CardContent>
          <p className="text-xs text-muted-foreground">Current Monthly Salary</p>
          <p className="mt-1 text-3xl font-bold">{formatCurrency(activeStructure?.monthlySalary || 0)}</p>
          {activeStructure && (
            <p className="mt-1 text-xs text-muted-foreground">
              Effective from {formatDate(activeStructure.effectiveFrom)} · {activeStructure.calculationType}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Revision History</CardTitle>
        </CardHeader>
        <CardContent>
          {revisions.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No revisions yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Effective From</TableHead>
                  <TableHead>Old Salary</TableHead>
                  <TableHead>New Salary</TableHead>
                  <TableHead>Reason</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {revisions.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{formatDate(r.effectiveFrom)}</TableCell>
                    <TableCell className="text-muted-foreground">{formatCurrency(r.oldSalary)}</TableCell>
                    <TableCell className="font-medium">{formatCurrency(r.newSalary)}</TableCell>
                    <TableCell className="text-muted-foreground">{r.reason || "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
