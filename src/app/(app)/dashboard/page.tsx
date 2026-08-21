import Link from "next/link";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/utils";
import { getFeesOverview } from "@/lib/fees";
import { getPendingSalaryReport } from "@/lib/payroll-reports";
import { getPendingStationaryReport } from "@/lib/stationary";
import {
  Users,
  Briefcase,
  IndianRupee,
  AlertCircle,
  Bus,
  ShoppingCart,
  Wallet,
  CalendarClock,
  UserPlus,
  ClipboardList,
  BookOpen,
  ScrollText,
  FileCheck,
  Layers,
  type LucideIcon,
} from "lucide-react";

type DashboardStat = {
  label: string;
  value: string | number;
  sub: string;
  icon: LucideIcon;
  tone: string;
  border: string;
  href: string;
};

function StatGrid({ stats }: { stats: DashboardStat[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((s) => (
        <Link key={s.label} href={s.href} className="block">
          <Card className={`border-t-2 ${s.border} transition-shadow hover:shadow-md`}>
            <CardContent className="flex items-start justify-between">
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className="mt-1 truncate text-2xl font-semibold">{s.value}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{s.sub}</p>
              </div>
              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${s.tone}`}>
                <s.icon className="h-4.5 w-4.5" />
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}

export default async function DashboardPage() {
  const [
    studentCount,
    activeStudentCount,
    teacherCount,
    standards,
    busCount,
    examCount,
    feesOverview,
    pendingSalary,
    pendingStationary,
    recentPayments,
    recentSalaryPayments,
    recentStationarySales,
    recentExams,
  ] = await Promise.all([
    prisma.student.count(),
    prisma.student.count({ where: { status: "ACTIVE" } }),
    prisma.teacher.count(),
    prisma.standard.count(),
    prisma.bus.count(),
    prisma.exam.count(),
    getFeesOverview(),
    getPendingSalaryReport(),
    getPendingStationaryReport(),
    prisma.feePayment.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { student: true },
    }),
    prisma.salaryPayment.findMany({
      where: { deletedAt: null },
      orderBy: { paymentDate: "desc" },
      take: 5,
      include: { teacher: true },
    }),
    prisma.stationarySale.findMany({
      orderBy: { saleDate: "desc" },
      take: 5,
      include: { student: true },
    }),
    prisma.exam.findMany({ where: { NOT: { isFinal: true } }, orderBy: { examDate: "desc" }, take: 5 }),
  ]);

  const totalSalaryPending = pendingSalary.reduce((sum, p) => sum + p.pendingAmount, 0);

  const primaryStats = [
    {
      label: "Total Students",
      value: studentCount,
      sub: `${activeStudentCount} active · ${standards} standards`,
      icon: Users,
      tone: "text-primary bg-primary/10",
      border: "border-t-primary",
      href: "/students",
    },
    {
      label: "Total Teachers",
      value: teacherCount,
      sub: "Registered staff",
      icon: Briefcase,
      tone: "text-violet-600 bg-violet-500/10",
      border: "border-t-violet-500",
      href: "/teachers",
    },
    {
      label: "Total Fees",
      value: formatCurrency(feesOverview.totalFees),
      sub: "All active students · tap for breakup",
      icon: IndianRupee,
      tone: "text-success bg-success/10",
      border: "border-t-success",
      href: "/fees-overview",
    },
  ];

  const secondaryStats = [
    {
      label: "School Buses",
      value: busCount,
      sub: "Active fleet",
      icon: Bus,
      tone: "text-orange-600 bg-orange-500/10",
      border: "border-t-orange-500",
      href: "/buses",
    },
    {
      label: "Stationary Pending",
      value: formatCurrency(pendingStationary.grandTotal),
      sub: `${pendingStationary.pending.length} sale${pendingStationary.pending.length === 1 ? "" : "s"} with balance`,
      icon: ShoppingCart,
      tone: "text-teal-600 bg-teal-500/10",
      border: "border-t-teal-500",
      href: "/stationary/pending",
    },
    {
      label: "Salary Pending",
      value: formatCurrency(totalSalaryPending),
      sub: `${pendingSalary.length} payroll${pendingSalary.length === 1 ? "" : "s"} unpaid`,
      icon: Wallet,
      tone: "text-amber-600 bg-amber-500/10",
      border: "border-t-amber-500",
      href: "/payroll-reports",
    },
    {
      label: "Exams",
      value: examCount,
      sub: "Terms configured",
      icon: CalendarClock,
      tone: "text-pink-600 bg-pink-500/10",
      border: "border-t-pink-500",
      href: "/exams",
    },
  ];

  const quickActions: { label: string; href: string; icon: LucideIcon }[] = [
    { label: "New Admission", href: "/students/new", icon: UserPlus },
    { label: "Record Payment", href: "/payments/new", icon: Wallet },
    { label: "Add Teacher", href: "/teachers/new", icon: Briefcase },
    { label: "Set Exam", href: "/exams", icon: CalendarClock },
    { label: "Enter Marks", href: "/exams/marks", icon: ClipboardList },
    { label: "Manage Subjects", href: "/subjects", icon: BookOpen },
    { label: "Stationary Sale", href: "/stationary/sales/new", icon: ShoppingCart },
    { label: "School Bus", href: "/buses/new", icon: Bus },
    { label: "Leaving Certificate", href: "/leaving-certificates/new", icon: ScrollText },
    { label: "Bonafide Certificate", href: "/bonafide-certificates/new", icon: FileCheck },
    { label: "Standards & Fees", href: "/standards", icon: Layers },
    { label: "Pending Fees", href: "/pending-fees", icon: AlertCircle },
  ];

  return (
    <div>
      <PageHeader title="Dashboard" description="Overview of school operations" />

      <StatGrid stats={primaryStats} />
      <div className="mt-4">
        <StatGrid stats={secondaryStats} />
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {quickActions.map((a) => (
              <Link
                key={a.label}
                href={a.href}
                className="flex flex-col items-center gap-1.5 rounded-lg border border-border p-3 text-center text-xs font-medium transition-colors hover:border-primary/40 hover:bg-primary/5"
              >
                <a.icon className="h-5 w-5 text-primary" />
                {a.label}
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

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
            <CardTitle>Recent Salary Payments</CardTitle>
          </CardHeader>
          <CardContent>
            {recentSalaryPayments.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No salary payments recorded yet.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Teacher</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentSalaryPayments.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>
                        <Link href={`/teachers/${p.teacherId}`} className="font-medium hover:text-primary hover:underline">
                          {p.teacher.name}
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
            <CardTitle>Recent Stationary Sales</CardTitle>
          </CardHeader>
          <CardContent>
            {recentStationarySales.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No stationary sales recorded yet.
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
                  {recentStationarySales.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell>
                        <Link href={`/students/${s.studentId}`} className="font-medium hover:text-primary hover:underline">
                          {s.student.name}
                        </Link>
                      </TableCell>
                      <TableCell>{formatDate(s.saleDate)}</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(s.totalAmount)}
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
            <CardTitle>Exams</CardTitle>
          </CardHeader>
          <CardContent>
            {recentExams.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No exams created yet.{" "}
                <Link href="/exams" className="text-primary hover:underline">
                  Set one up
                </Link>
                .
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Exam / Term</TableHead>
                    <TableHead>Exam Date</TableHead>
                    <TableHead className="text-right">Result Link</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentExams.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell className="font-medium">{e.name}</TableCell>
                      <TableCell>{formatDate(e.examDate)}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant={e.resultLinkActive ? "success" : "outline"}>
                          {e.resultLinkActive ? "Active" : "Off"}
                        </Badge>
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
