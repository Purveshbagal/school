import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/utils";
import { ArrowLeft } from "lucide-react";

const TYPE_LABEL: Record<string, string> = {
  SALARY_STRUCTURE_ASSIGNED: "Salary Structure Assigned",
  SALARY_REVISED: "Salary Revised",
  ADVANCE_GIVEN: "Advance Given",
  ADVANCE_EDITED: "Advance Edited",
  ADVANCE_DELETED: "Advance Deleted",
  ATTENDANCE_SAVED: "Attendance Saved",
  SALARY_GENERATED: "Salary Generated",
  BONUS_ADDED: "Bonus",
  DEDUCTION_ADDED: "Deduction",
  SALARY_PAID: "Salary Paid",
  PAYROLL_LOCKED: "Payroll Locked",
  PAYROLL_UNLOCKED: "Payroll Unlocked",
};

const TYPE_VARIANT: Record<string, "success" | "warning" | "destructive" | "outline" | "info"> = {
  SALARY_STRUCTURE_ASSIGNED: "outline",
  SALARY_REVISED: "info",
  ADVANCE_GIVEN: "info",
  ADVANCE_EDITED: "outline",
  ADVANCE_DELETED: "destructive",
  ATTENDANCE_SAVED: "outline",
  SALARY_GENERATED: "outline",
  BONUS_ADDED: "success",
  DEDUCTION_ADDED: "warning",
  SALARY_PAID: "success",
  PAYROLL_LOCKED: "destructive",
  PAYROLL_UNLOCKED: "outline",
};

export default async function TeacherSalaryHistoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const teacher = await prisma.teacher.findUnique({ where: { id } });
  if (!teacher) notFound();

  const ledger = await prisma.salaryLedger.findMany({
    where: { teacherId: id },
    orderBy: { date: "desc" },
    take: 200,
  });

  return (
    <div>
      <PageHeader
        title={teacher.name}
        description={`${teacher.designation || "Staff"} — Complete salary ledger`}
        actions={
          <Button variant="outline" size="sm" render={<Link href="/salary-history">Back</Link>}>
            <ArrowLeft /> Back
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          {ledger.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No activity recorded yet.</p>
          ) : (
            <ol className="relative space-y-5 border-l border-border pl-5">
              {ledger.map((entry) => (
                <li key={entry.id} className="relative">
                  <span className="absolute top-1 -left-[1.4rem] h-2.5 w-2.5 rounded-full border-2 border-background bg-primary" />
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={TYPE_VARIANT[entry.type] || "outline"}>{TYPE_LABEL[entry.type] || entry.type}</Badge>
                    <span className="text-xs text-muted-foreground">{formatDate(entry.date)}</span>
                    {entry.createdBy && <span className="text-xs text-muted-foreground">by {entry.createdBy}</span>}
                  </div>
                  <p className="mt-1 text-sm">{entry.description}</p>
                  {entry.amount !== 0 && (
                    <p className="text-sm font-medium">{formatCurrency(entry.amount)}</p>
                  )}
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
