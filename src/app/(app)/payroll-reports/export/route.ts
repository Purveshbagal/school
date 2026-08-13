import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { MONTH_NAMES } from "@/lib/payroll-engine";
import {
  getMonthlySalaryReport,
  getTeacherWiseReport,
  getAdvanceReport,
  getPendingSalaryReport,
  getPaymentHistoryReport,
  getLedgerReport,
  toCsv,
} from "@/lib/payroll-reports";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return new Response("Unauthorized", { status: 401 });

  const { searchParams } = request.nextUrl;
  const type = searchParams.get("type") || "monthly";
  const now = new Date();
  const month = Number(searchParams.get("month")) || now.getMonth() + 1;
  const year = Number(searchParams.get("year")) || now.getFullYear();

  let csv: string;
  let filename: string;

  switch (type) {
    case "monthly": {
      const rows = await getMonthlySalaryReport(month, year);
      csv = toCsv(
        ["Invoice No", "Teacher", "Gross Salary", "Deductions", "Bonus", "Net Payable", "Paid", "Pending", "Status"],
        rows.map((p) => [
          p.invoiceNo, p.teacher.name, p.grossSalary,
          p.leaveDeduction + p.halfDayDeduction + p.lateDeduction + p.otherDeductionsTotal,
          p.bonusTotal, p.netPayable, p.paidAmount, p.pendingAmount, p.status,
        ])
      );
      filename = `monthly-salary-${MONTH_NAMES[month - 1]}-${year}.csv`;
      break;
    }
    case "teacher-wise": {
      const rows = await getTeacherWiseReport();
      csv = toCsv(
        ["Teacher", "Employee No", "Payrolls Generated", "Total Generated", "Total Paid", "Total Pending"],
        rows.map((r) => [r.teacher.name, r.teacher.employeeNo, r.payrollCount, r.totalGenerated, r.totalPaid, r.totalPending])
      );
      filename = "teacher-wise-report.csv";
      break;
    }
    case "advance": {
      const rows = await getAdvanceReport();
      csv = toCsv(
        ["Date", "Teacher", "Amount", "Adjusted", "Status", "Note"],
        rows.map((a) => [a.date.toISOString().slice(0, 10), a.teacher.name, a.amount, a.adjustedAmount, a.status, a.note || ""])
      );
      filename = "advance-report.csv";
      break;
    }
    case "pending": {
      const rows = await getPendingSalaryReport();
      csv = toCsv(
        ["Teacher", "Month", "Year", "Net Payable", "Paid", "Pending", "Status"],
        rows.map((p) => [p.teacher.name, MONTH_NAMES[p.month - 1], p.year, p.netPayable, p.paidAmount, p.pendingAmount, p.status])
      );
      filename = "pending-salary-report.csv";
      break;
    }
    case "payments": {
      const rows = await getPaymentHistoryReport();
      csv = toCsv(
        ["Date", "Teacher", "Amount", "Mode", "Reference", "Payroll Invoice"],
        rows.map((p) => [
          p.paymentDate.toISOString().slice(0, 10), p.teacher.name, p.amount, p.paymentMode, p.referenceNo || "", p.payroll.invoiceNo,
        ])
      );
      filename = "payment-history-report.csv";
      break;
    }
    case "ledger": {
      const rows = await getLedgerReport();
      csv = toCsv(
        ["Date", "Teacher", "Type", "Amount", "Description", "By"],
        rows.map((l) => [l.date.toISOString().slice(0, 10), l.teacher.name, l.type, l.amount, l.description, l.createdBy || ""])
      );
      filename = "ledger-report.csv";
      break;
    }
    default:
      return new Response("Unknown report type", { status: 400 });
  }

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
