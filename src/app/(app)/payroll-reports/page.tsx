import Link from "next/link";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
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
import { NativeSelect } from "@/components/ui/native-select";
import { MONTH_NAMES } from "@/lib/payroll-engine";
import {
  getMonthlySalaryReport,
  getTeacherWiseReport,
  getAdvanceReport,
  getPendingSalaryReport,
  getPaymentHistoryReport,
  getLedgerReport,
} from "@/lib/payroll-reports";
import { Download } from "lucide-react";

const TABS = [
  { value: "monthly", label: "Monthly Salary" },
  { value: "teacher-wise", label: "Teacher Wise" },
  { value: "advance", label: "Advance" },
  { value: "pending", label: "Pending Salary" },
  { value: "payments", label: "Payment History" },
  { value: "ledger", label: "Ledger" },
] as const;

const STATUS_VARIANT: Record<string, "success" | "warning" | "destructive" | "outline"> = {
  PAID: "success",
  PARTIALLY_PAID: "warning",
  GENERATED: "destructive",
  ADJUSTED: "success",
  PARTIALLY_ADJUSTED: "warning",
  UNADJUSTED: "outline",
};

export default async function PayrollReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; month?: string; year?: string }>;
}) {
  const { tab: tabParam, month: monthParam, year: yearParam } = await searchParams;
  const tab = TABS.some((t) => t.value === tabParam) ? tabParam! : "monthly";
  const now = new Date();
  const month = Number(monthParam) || now.getMonth() + 1;
  const year = Number(yearParam) || now.getFullYear();
  const years = Array.from({ length: 6 }, (_, i) => now.getFullYear() - 3 + i);

  return (
    <div>
      <PageHeader title="Payroll Reports" description="Export or print payroll data across every teacher" />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1.5 border-b border-border">
          {TABS.map((t) => (
            <Link
              key={t.value}
              href={`/payroll-reports?tab=${t.value}&month=${month}&year=${year}`}
              className={cn(
                "-mb-px shrink-0 border-b-2 px-3.5 py-2 text-sm font-medium transition-colors",
                tab === t.value ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {t.label}
            </Link>
          ))}
        </div>

        <div className="flex items-end gap-2">
          {tab === "monthly" && (
            <form className="flex items-end gap-2" action="/payroll-reports">
              <input type="hidden" name="tab" value={tab} />
              <NativeSelect name="month" defaultValue={month} className="w-32">
                {MONTH_NAMES.map((m, i) => (
                  <option key={m} value={i + 1}>{m}</option>
                ))}
              </NativeSelect>
              <NativeSelect name="year" defaultValue={year} className="w-24">
                {years.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </NativeSelect>
              <Button type="submit" variant="outline" size="sm">Go</Button>
            </form>
          )}
          <Button
            variant="outline"
            size="sm"
            render={<a href={`/payroll-reports/export?type=${tab}&month=${month}&year=${year}`}><Download /> Export CSV</a>}
          />
        </div>
      </div>

      <Card>
        <CardContent>
          {tab === "monthly" && <MonthlyReport month={month} year={year} />}
          {tab === "teacher-wise" && <TeacherWiseReport />}
          {tab === "advance" && <AdvanceReport />}
          {tab === "pending" && <PendingReport />}
          {tab === "payments" && <PaymentsReport />}
          {tab === "ledger" && <LedgerReport />}
        </CardContent>
      </Card>
    </div>
  );
}

async function MonthlyReport({ month, year }: { month: number; year: number }) {
  const rows = await getMonthlySalaryReport(month, year);
  if (rows.length === 0) return <Empty text={`No payroll generated for ${MONTH_NAMES[month - 1]} ${year}.`} />;
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Invoice No</TableHead>
          <TableHead>Teacher</TableHead>
          <TableHead>Gross</TableHead>
          <TableHead>Net Payable</TableHead>
          <TableHead>Paid</TableHead>
          <TableHead>Pending</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((p) => (
          <TableRow key={p.id}>
            <TableCell className="font-mono text-xs">{p.invoiceNo}</TableCell>
            <TableCell className="font-medium">{p.teacher.name}</TableCell>
            <TableCell>{formatCurrency(p.grossSalary)}</TableCell>
            <TableCell className="font-medium">{formatCurrency(p.netPayable)}</TableCell>
            <TableCell>{formatCurrency(p.paidAmount)}</TableCell>
            <TableCell>{formatCurrency(p.pendingAmount)}</TableCell>
            <TableCell><Badge variant={STATUS_VARIANT[p.status] || "outline"}>{p.status.replace("_", " ")}</Badge></TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

async function TeacherWiseReport() {
  const rows = await getTeacherWiseReport();
  if (rows.length === 0) return <Empty text="No staff members added yet." />;
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Teacher</TableHead>
          <TableHead>Payrolls Generated</TableHead>
          <TableHead>Total Generated</TableHead>
          <TableHead>Total Paid</TableHead>
          <TableHead>Total Pending</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r) => (
          <TableRow key={r.teacher.id}>
            <TableCell className="font-medium">{r.teacher.name}</TableCell>
            <TableCell>{r.payrollCount}</TableCell>
            <TableCell>{formatCurrency(r.totalGenerated)}</TableCell>
            <TableCell>{formatCurrency(r.totalPaid)}</TableCell>
            <TableCell className={r.totalPending > 0 ? "text-destructive" : ""}>{formatCurrency(r.totalPending)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

async function AdvanceReport() {
  const rows = await getAdvanceReport();
  if (rows.length === 0) return <Empty text="No advances recorded yet." />;
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Teacher</TableHead>
          <TableHead>Amount</TableHead>
          <TableHead>Adjusted</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Note</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((a) => (
          <TableRow key={a.id}>
            <TableCell>{formatDate(a.date)}</TableCell>
            <TableCell className="font-medium">{a.teacher.name}</TableCell>
            <TableCell>{formatCurrency(a.amount)}</TableCell>
            <TableCell>{formatCurrency(a.adjustedAmount)}</TableCell>
            <TableCell><Badge variant={STATUS_VARIANT[a.status] || "outline"}>{a.status.replace("_", " ")}</Badge></TableCell>
            <TableCell className="text-muted-foreground">{a.note || "-"}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

async function PendingReport() {
  const rows = await getPendingSalaryReport();
  if (rows.length === 0) return <Empty text="No pending salary — everything is settled." />;
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Teacher</TableHead>
          <TableHead>Period</TableHead>
          <TableHead>Net Payable</TableHead>
          <TableHead>Paid</TableHead>
          <TableHead>Pending</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((p) => (
          <TableRow key={p.id}>
            <TableCell className="font-medium">{p.teacher.name}</TableCell>
            <TableCell>{MONTH_NAMES[p.month - 1]} {p.year}</TableCell>
            <TableCell>{formatCurrency(p.netPayable)}</TableCell>
            <TableCell>{formatCurrency(p.paidAmount)}</TableCell>
            <TableCell className="font-medium text-destructive">{formatCurrency(p.pendingAmount)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

async function PaymentsReport() {
  const rows = await getPaymentHistoryReport();
  if (rows.length === 0) return <Empty text="No payments recorded yet." />;
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Teacher</TableHead>
          <TableHead>Amount</TableHead>
          <TableHead>Mode</TableHead>
          <TableHead>Reference</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((p) => (
          <TableRow key={p.id}>
            <TableCell>{formatDate(p.paymentDate)}</TableCell>
            <TableCell className="font-medium">{p.teacher.name}</TableCell>
            <TableCell>{formatCurrency(p.amount)}</TableCell>
            <TableCell>{p.paymentMode}</TableCell>
            <TableCell className="text-muted-foreground">{p.referenceNo || "-"}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

async function LedgerReport() {
  const rows = await getLedgerReport();
  if (rows.length === 0) return <Empty text="No ledger activity yet." />;
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Teacher</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Amount</TableHead>
          <TableHead>Description</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((l) => (
          <TableRow key={l.id}>
            <TableCell>{formatDate(l.date)}</TableCell>
            <TableCell className="font-medium">{l.teacher.name}</TableCell>
            <TableCell>{l.type.replace(/_/g, " ")}</TableCell>
            <TableCell>{l.amount ? formatCurrency(l.amount) : "-"}</TableCell>
            <TableCell className="text-muted-foreground">{l.description}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="py-10 text-center text-sm text-muted-foreground">{text}</p>;
}
