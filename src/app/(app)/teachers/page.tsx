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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DeleteButton } from "@/components/delete-button";
import { formatCurrency } from "@/lib/utils";
import { deleteTeacherAction } from "@/app/actions/teachers";
import { UserPlus } from "lucide-react";

function deleteConfirmMessage(name: string, hasPayrollHistory: boolean) {
  if (hasPayrollHistory) {
    return `Delete ${name}? This teacher has payroll runs, salary payments, attendance, and/or advances on file — deleting permanently erases ALL of that history too, with no way to recover it. If you only want to stop showing them as staff, set their status to Inactive instead. This cannot be undone.`;
  }
  return `Delete ${name}? This will also delete all their advances and salary slips. This cannot be undone.`;
}

export default async function TeachersPage() {
  const teachers = await prisma.teacher.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      salaryStructures: { where: { status: "ACTIVE", deletedAt: null }, orderBy: { effectiveFrom: "desc" }, take: 1 },
      advancePayments: { where: { deletedAt: null, status: { in: ["UNADJUSTED", "PARTIALLY_ADJUSTED"] } } },
      _count: {
        select: {
          salaryRevisions: true,
          advancePayments: true,
          attendanceSummaries: true,
          payrolls: true,
          salaryPayments: true,
          salaryLedgers: { where: { type: { not: "SALARY_STRUCTURE_ASSIGNED" } } },
        },
      },
    },
  });
  const summaries = teachers.map((t) => ({
    monthlySalary: t.salaryStructures[0]?.monthlySalary ?? t.monthlySalary,
    outstandingAdvance: t.advancePayments.reduce((sum, a) => sum + (a.amount - a.adjustedAmount), 0),
    // The auto-assigned SalaryStructure and its "SALARY_STRUCTURE_ASSIGNED" ledger entry
    // (created for every teacher on add) are excluded — they don't represent real payroll
    // activity. Only genuine activity blocks deletion.
    hasPayrollHistory:
      t._count.salaryRevisions +
        t._count.advancePayments +
        t._count.attendanceSummaries +
        t._count.payrolls +
        t._count.salaryPayments +
        t._count.salaryLedgers >
      0,
  }));

  return (
    <div>
      <PageHeader
        title="Teachers"
        description={`${teachers.length} staff member${teachers.length === 1 ? "" : "s"}`}
        actions={
          <Button render={<Link href="/teachers/new" />}>
            <UserPlus /> Add Teacher
          </Button>
        }
      />

      <Card>
        <CardContent>
          {teachers.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No teachers added yet.
            </p>
          ) : (
            <>
              {/* Mobile card list */}
              <div className="space-y-3 md:hidden">
                {teachers.map((t, i) => {
                  const sum = summaries[i];
                  return (
                    <div key={t.id} className="rounded-xl border border-border p-3.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <Link href={`/teachers/${t.id}`} className="font-medium hover:text-primary hover:underline">
                            {t.name}
                          </Link>
                          <p className="mt-0.5 font-mono text-xs text-muted-foreground">{t.employeeNo}</p>
                        </div>
                        <Badge variant={t.status === "ACTIVE" ? "success" : "outline"} className="shrink-0">
                          {t.status}
                        </Badge>
                      </div>
                      <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
                        <div>
                          <dt className="text-muted-foreground">Designation</dt>
                          <dd className="font-medium">{t.designation || "-"}</dd>
                        </div>
                        <div>
                          <dt className="text-muted-foreground">Monthly Salary</dt>
                          <dd className="font-medium">{formatCurrency(sum.monthlySalary)}</dd>
                        </div>
                      </dl>
                      <div className="mt-3 flex items-center justify-between gap-2">
                        {sum && sum.outstandingAdvance > 0 ? (
                          <Badge variant="warning">{formatCurrency(sum.outstandingAdvance)}</Badge>
                        ) : (
                          <Badge variant="outline">No advance</Badge>
                        )}
                        <div className="flex gap-1.5">
                          <Button variant="outline" size="sm" render={<Link href={`/teachers/${t.id}`}>View</Link>} />
                          <DeleteButton
                            action={deleteTeacherAction}
                            hiddenFields={{ id: t.id }}
                            confirmMessage={deleteConfirmMessage(t.name, sum.hasPayrollHistory)}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop table */}
              <Table className="hidden md:table">
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee No</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Designation</TableHead>
                    <TableHead>Monthly Salary</TableHead>
                    <TableHead>Advance Outstanding</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teachers.map((t, i) => {
                    const sum = summaries[i];
                    return (
                      <TableRow key={t.id}>
                        <TableCell className="font-mono text-xs">{t.employeeNo}</TableCell>
                        <TableCell className="font-medium">
                          <Link href={`/teachers/${t.id}`} className="hover:text-primary hover:underline">
                            {t.name}
                          </Link>
                        </TableCell>
                        <TableCell>{t.designation || "-"}</TableCell>
                        <TableCell>{formatCurrency(sum.monthlySalary)}</TableCell>
                        <TableCell>
                          {sum && sum.outstandingAdvance > 0 ? (
                            <Badge variant="warning">{formatCurrency(sum.outstandingAdvance)}</Badge>
                          ) : (
                            <Badge variant="outline">None</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={t.status === "ACTIVE" ? "success" : "outline"}>
                            {t.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1.5">
                            <Button variant="outline" size="sm" render={<Link href={`/teachers/${t.id}`}>View</Link>} />
                            <DeleteButton
                              action={deleteTeacherAction}
                              hiddenFields={{ id: t.id }}
                              confirmMessage={deleteConfirmMessage(t.name, sum.hasPayrollHistory)}
                            />
                          </div>
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
