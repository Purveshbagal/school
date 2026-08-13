import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatCurrency, formatDate, amountToWords } from "@/lib/utils";
import { MONTH_NAMES } from "@/lib/payroll-engine";
import { PrintDownloadActions } from "@/components/print-download-actions";
import { DocumentHeader } from "@/components/document-header";
import { Badge } from "@/components/ui/badge";

const STATUS_VARIANT: Record<string, "success" | "warning" | "destructive" | "outline"> = {
  PAID: "success",
  PARTIALLY_PAID: "warning",
  GENERATED: "destructive",
};

export default async function SalarySlipPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { id } = await params;

  const payroll = await prisma.payroll.findUnique({
    where: { id },
    include: { teacher: true, bonuses: true, deductions: true, payments: { orderBy: { paymentDate: "asc" } } },
  });
  if (!payroll || payroll.deletedAt) notFound();

  const settings = await prisma.schoolSettings.findUnique({ where: { id: "main" } });

  const attendanceRows: [string, string | number][] = [
    ["Working Days", payroll.workingDays],
    ["Present Days", payroll.presentDays],
    ["Absent Days", payroll.absentDays],
    ["Half Days", payroll.halfDays],
    ["Paid Leave", payroll.paidLeaveDays],
    ["Unpaid Leave", payroll.unpaidLeaveDays],
    ["Late Count", payroll.lateCount],
  ];

  const earningRows: [string, number][] = [
    ["Gross Salary", payroll.grossSalary] as [string, number],
    ...payroll.bonuses.map((b) => [`Bonus — ${b.type}${b.note ? ` (${b.note})` : ""}`, b.amount] as [string, number]),
  ];

  const deductionRows: [string, number][] = (
    [
      ["Leave Deduction", payroll.leaveDeduction],
      ["Half Day Deduction", payroll.halfDayDeduction],
      ["Late Deduction", payroll.lateDeduction],
      ...(payroll.statutoryDeductionsTotal > 0 ? [["Statutory (PF/ESIC/PT)", payroll.statutoryDeductionsTotal]] : []),
      ...payroll.deductions.map((d) => [`${d.type}${d.note ? ` (${d.note})` : ""}`, d.amount]),
      ["Advance Applied", payroll.advanceApplied],
    ] as [string, number][]
  ).filter(([, amt]) => amt > 0);

  const totalEarnings = earningRows.reduce((s, [, a]) => s + a, 0) + payroll.previousPending;
  const totalDeductions = deductionRows.reduce((s, [, a]) => s + a, 0);

  return (
    <div className="min-h-screen bg-slate-100 py-8 print:bg-white print:py-0">
      <div className="mx-auto mb-4 max-w-2xl px-4 print:hidden">
        <PrintDownloadActions targetId="print-content" fileName={`Salary-Slip-${payroll.invoiceNo}`} />
      </div>

      <div
        id="print-content"
        className="mx-auto max-w-2xl bg-white p-8 shadow-lg ring-1 ring-slate-200 print:p-12 print:shadow-none print:ring-0"
      >
        <DocumentHeader
          docType="Salary Slip"
          schoolName={settings?.name || "School Name"}
          address={settings?.address}
          udise={settings?.udise}
          phone={settings?.phone}
        />

        <div className="my-5 border-t border-dashed border-slate-300" />

        <div className="grid grid-cols-2 gap-y-2 text-sm">
          <div>
            <span className="text-slate-500">Invoice No: </span>
            <span className="font-semibold">{payroll.invoiceNo}</span>
          </div>
          <div className="text-right">
            <span className="text-slate-500">Generated: </span>
            <span className="font-semibold">{formatDate(payroll.createdAt)}</span>
          </div>
          <div>
            <span className="text-slate-500">Employee: </span>
            <span className="font-semibold">{payroll.teacher.name}</span>
          </div>
          <div className="text-right">
            <span className="text-slate-500">Employee No: </span>
            <span className="font-semibold">{payroll.teacher.employeeNo}</span>
          </div>
          <div>
            <span className="text-slate-500">Designation: </span>
            <span className="font-semibold">{payroll.teacher.designation || "-"}</span>
          </div>
          <div className="text-right">
            <span className="text-slate-500">Month: </span>
            <span className="font-semibold">{MONTH_NAMES[payroll.month - 1]} {payroll.year}</span>
          </div>
        </div>

        <div className="my-4 flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
          <span className="text-sm text-slate-500">Status</span>
          <Badge variant={STATUS_VARIANT[payroll.status] || "outline"}>{payroll.status.replace("_", " ")}</Badge>
        </div>

        <table className="w-full border-collapse overflow-hidden rounded-lg text-sm">
          <thead>
            <tr className="bg-blue-600 text-white">
              <th className="px-3 py-2 text-left font-medium" colSpan={2}>Attendance</th>
            </tr>
          </thead>
          <tbody>
            {attendanceRows.map(([label, val]) => (
              <tr key={label} className="border-b border-slate-200">
                <td className="px-3 py-1.5 text-slate-600">{label}</td>
                <td className="px-3 py-1.5 text-right text-slate-600">{val}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <table className="mt-4 w-full border-collapse overflow-hidden rounded-lg text-sm">
          <thead>
            <tr className="bg-emerald-600 text-white">
              <th className="px-3 py-2 text-left font-medium">Earnings</th>
              <th className="px-3 py-2 text-right font-medium">Amount</th>
            </tr>
          </thead>
          <tbody>
            {earningRows.map(([label, amt]) => (
              <tr key={label} className="border-b border-slate-200">
                <td className="px-3 py-1.5 text-slate-600">{label}</td>
                <td className="px-3 py-1.5 text-right text-slate-600">{formatCurrency(amt)}</td>
              </tr>
            ))}
            {payroll.previousPending > 0 && (
              <tr className="border-b border-slate-200">
                <td className="px-3 py-1.5 text-slate-600">Previous Month Pending</td>
                <td className="px-3 py-1.5 text-right text-slate-600">{formatCurrency(payroll.previousPending)}</td>
              </tr>
            )}
            <tr className="bg-emerald-50 font-semibold">
              <td className="px-3 py-2">Total Earnings</td>
              <td className="px-3 py-2 text-right">{formatCurrency(totalEarnings)}</td>
            </tr>
          </tbody>
        </table>

        <table className="mt-4 w-full border-collapse overflow-hidden rounded-lg text-sm">
          <thead>
            <tr className="bg-rose-600 text-white">
              <th className="px-3 py-2 text-left font-medium">Deductions</th>
              <th className="px-3 py-2 text-right font-medium">Amount</th>
            </tr>
          </thead>
          <tbody>
            {deductionRows.length === 0 ? (
              <tr>
                <td className="px-3 py-1.5 text-slate-500" colSpan={2}>No deductions</td>
              </tr>
            ) : (
              deductionRows.map(([label, amt]) => (
                <tr key={label} className="border-b border-slate-200">
                  <td className="px-3 py-1.5 text-slate-600">{label}</td>
                  <td className="px-3 py-1.5 text-right text-slate-600">{formatCurrency(amt)}</td>
                </tr>
              ))
            )}
            <tr className="bg-rose-50 font-semibold">
              <td className="px-3 py-2">Total Deductions</td>
              <td className="px-3 py-2 text-right">{formatCurrency(totalDeductions)}</td>
            </tr>
          </tbody>
        </table>

        <table className="mt-4 w-full border-collapse overflow-hidden rounded-lg text-sm">
          <tbody>
            <tr className="border-b border-slate-200 bg-blue-50 font-semibold">
              <td className="px-3 py-2.5">Net Payable</td>
              <td className="px-3 py-2.5 text-right">{formatCurrency(payroll.netPayable)}</td>
            </tr>
            <tr className="border-b border-slate-200">
              <td className="px-3 py-2">Paid Amount</td>
              <td className="px-3 py-2 text-right">{formatCurrency(payroll.paidAmount)}</td>
            </tr>
            <tr className="bg-slate-100 font-semibold">
              <td className="px-3 py-2.5">Pending Amount</td>
              <td className="px-3 py-2.5 text-right">{formatCurrency(payroll.pendingAmount)}</td>
            </tr>
          </tbody>
        </table>

        <p className="mt-4 text-sm">
          <span className="text-slate-500">Amount in words: </span>
          <span className="font-medium italic">{amountToWords(payroll.netPayable)}</span>
        </p>

        {payroll.payments.length > 0 && (
          <div className="mt-4 text-sm">
            <p className="mb-1 text-slate-500">Payment History:</p>
            <ul className="list-inside list-disc space-y-0.5 text-slate-600">
              {payroll.payments.map((p) => (
                <li key={p.id}>
                  {formatCurrency(p.amount)} via {p.paymentMode} on {formatDate(p.paymentDate)}
                  {p.referenceNo ? ` (Ref: ${p.referenceNo})` : ""}
                </li>
              ))}
            </ul>
          </div>
        )}

        {payroll.remarks && <p className="mt-2 text-sm text-slate-500">Remarks: {payroll.remarks}</p>}

        <div className="mt-14 flex items-end justify-between text-sm">
          <p className="text-slate-400">This is a computer generated salary slip.</p>
          <div className="text-center">
            <div className="mb-1 h-10 w-40 border-b border-slate-400" />
            <p className="text-slate-500">Authorized Signatory</p>
          </div>
        </div>
      </div>
    </div>
  );
}
