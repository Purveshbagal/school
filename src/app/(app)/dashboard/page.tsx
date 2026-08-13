import Link from "next/link";
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
import { formatCurrency, formatDate } from "@/lib/utils";
import { getStudentFeeSummary, getPendingFeesReport } from "@/lib/fees";
import { Users, Briefcase, IndianRupee, AlertCircle } from "lucide-react";

export default async function DashboardPage() {
  const [studentCount, activeStudentCount, teacherCount, standards] = await Promise.all([
    prisma.student.count(),
    prisma.student.count({ where: { status: "ACTIVE" } }),
    prisma.teacher.count(),
    prisma.standard.count(),
  ]);

  const allStudents = await prisma.student.findMany({ select: { id: true } });
  const summaries = await Promise.all(allStudents.map((s) => getStudentFeeSummary(s.id)));
  const totalCollected = summaries.reduce((s, x) => s + (x?.totalPaid || 0), 0);
  const { grandTotal: totalDue } = await getPendingFeesReport();

  const recentPayments = await prisma.feePayment.findMany({
    orderBy: { createdAt: "desc" },
    take: 6,
    include: { student: true },
  });

  const recentSlips = await prisma.salarySlip.findMany({
    orderBy: { createdAt: "desc" },
    take: 6,
    include: { teacher: true },
  });

  const stats = [
    {
      label: "Total Students",
      value: studentCount,
      sub: `${activeStudentCount} active · ${standards} standards`,
      icon: Users,
      tone: "text-primary bg-primary/10",
      border: "border-t-primary",
    },
    {
      label: "Total Teachers",
      value: teacherCount,
      sub: "Registered staff",
      icon: Briefcase,
      tone: "text-violet-600 bg-violet-500/10",
      border: "border-t-violet-500",
    },
    {
      label: "Fees Collected",
      value: formatCurrency(totalCollected),
      sub: "All time",
      icon: IndianRupee,
      tone: "text-success bg-success/10",
      border: "border-t-success",
    },
    {
      label: "Fees Due",
      value: formatCurrency(totalDue),
      sub: "Outstanding balance",
      icon: AlertCircle,
      tone: "text-destructive bg-destructive/10",
      border: "border-t-destructive",
      href: "/pending-fees",
    },
  ];

  return (
    <div>
      <PageHeader title="Dashboard" description="Overview of school operations" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => {
          const card = (
            <Card className={`border-t-2 ${s.border} transition-shadow hover:shadow-md`}>
              <CardContent className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                  <p className="mt-1 text-2xl font-semibold">{s.value}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{s.sub}</p>
                </div>
                <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${s.tone}`}>
                  <s.icon className="h-4.5 w-4.5" />
                </div>
              </CardContent>
            </Card>
          );
          return s.href ? (
            <Link key={s.label} href={s.href} className="block">
              {card}
            </Link>
          ) : (
            <div key={s.label}>{card}</div>
          );
        })}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Fee Payments</CardTitle>
          </CardHeader>
          <CardContent>
            {recentPayments.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No payments recorded yet.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentPayments.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>
                        <Link href={`/students/${p.studentId}`} className="font-medium hover:text-primary hover:underline">
                          {p.student.name}
                        </Link>
                      </TableCell>
                      <TableCell>{formatDate(p.paymentDate)}</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(p.amount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Salary Slips</CardTitle>
          </CardHeader>
          <CardContent>
            {recentSlips.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No salary slips generated yet.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Teacher</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentSlips.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell>
                        <Link href={`/teachers/${s.teacherId}`} className="font-medium hover:text-primary hover:underline">
                          {s.teacher.name}
                        </Link>
                      </TableCell>
                      <TableCell>
                        {s.month}/{s.year}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(s.total)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
