import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getActiveSalaryStructure, getOutstandingAdvanceTotal, getLastPayroll } from "@/lib/payroll-data";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DeleteButton } from "@/components/delete-button";
import { formatCurrency, formatDate } from "@/lib/utils";
import { deleteTeacherAction } from "@/app/actions/teachers";
import { Pencil, TrendingUp, CircleDollarSign, HandCoins, History } from "lucide-react";

export default async function TeacherDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const teacher = await prisma.teacher.findUnique({ where: { id } });
  if (!teacher) notFound();

  const [structure, outstandingAdvance, lastPayroll] = await Promise.all([
    getActiveSalaryStructure(id),
    getOutstandingAdvanceTotal(id),
    getLastPayroll(id),
  ]);
  const pendingFromLastPayroll = lastPayroll ? Math.max(0, lastPayroll.pendingAmount) : 0;

  return (
    <div>
      <PageHeader
        title={teacher.name}
        description={`Employee No: ${teacher.employeeNo} · ${teacher.designation || "Staff"}`}
        actions={
          <>
            <Button variant="outline" render={<Link href={`/teachers/${id}/edit`}><Pencil /> Edit</Link>} />
            <DeleteButton
              action={deleteTeacherAction}
              hiddenFields={{ id }}
              confirmMessage={`Delete ${teacher.name}? Their payroll history is kept for records but this cannot be undone for the teacher record itself.`}
              label="Delete"
              size="default"
              className="border border-transparent hover:border-destructive/20"
            />
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="min-w-0 space-y-6 lg:col-span-2">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
            <Card size="sm" className="border-t-2 border-t-primary">
              <CardContent>
                <p className="text-xs text-muted-foreground">Monthly Salary</p>
                <p className="mt-1 text-lg font-semibold">{formatCurrency(structure?.monthlySalary || 0)}</p>
              </CardContent>
            </Card>
            <Card size="sm" className="border-t-2 border-t-info">
              <CardContent>
                <p className="text-xs text-muted-foreground">Advance Outstanding</p>
                <p className="mt-1 text-lg font-semibold text-info">{formatCurrency(outstandingAdvance)}</p>
              </CardContent>
            </Card>
            <Card size="sm" className="col-span-2 border-t-2 border-t-warning sm:col-span-1">
              <CardContent>
                <p className="text-xs text-muted-foreground">Pending Salary</p>
                <p className="mt-1 text-lg font-semibold text-warning">{formatCurrency(pendingFromLastPayroll)}</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Staff Details</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-3">
                <div>
                  <dt className="text-muted-foreground">Phone</dt>
                  <dd className="font-medium">{teacher.phone || "-"}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Email</dt>
                  <dd className="font-medium">{teacher.email || "-"}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Joining Date</dt>
                  <dd className="font-medium">{formatDate(teacher.joiningDate)}</dd>
                </div>
                <div className="col-span-2 sm:col-span-3">
                  <dt className="text-muted-foreground">Address</dt>
                  <dd className="font-medium">{teacher.address || "-"}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Payroll</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full justify-start" render={<Link href={`/payroll/${id}`}><CircleDollarSign /> Payroll</Link>} />
              <Button variant="outline" className="w-full justify-start" render={<Link href={`/salary-structure/${id}`}><TrendingUp /> Salary Structure</Link>} />
              <Button variant="outline" className="w-full justify-start" render={<Link href={`/advance-payments/${id}`}><HandCoins /> Advance Payments</Link>} />
              <Button variant="outline" className="w-full justify-start" render={<Link href={`/salary-history/${id}`}><History /> Salary History</Link>} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
