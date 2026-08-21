import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getOutstandingAdvanceTotal } from "@/lib/payroll-data";
import { formatNumber, amountToWords } from "@/lib/utils";
import { MONTH_NAMES } from "@/lib/payroll-engine";
import { PrintDownloadActions } from "@/components/print-download-actions";

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
    include: { teacher: true, bonuses: true, deductions: true },
  });
  if (!payroll || payroll.deletedAt) notFound();

  const settings = await prisma.schoolSettings.findUnique({ where: { id: "main" } });

  const monthStart = new Date(payroll.year, payroll.month - 1, 1);
  const monthEnd = new Date(payroll.year, payroll.month, 0, 23, 59, 59, 999);
  const monthName = MONTH_NAMES[payroll.month - 1];
  const workingRange = `1 ${monthName} to ${monthEnd.getDate()} ${monthName}`;

  const [advanceGivenThisMonth, advanceRemaining] = await Promise.all([
    prisma.advancePayment
      .findMany({ where: { teacherId: payroll.teacherId, deletedAt: null, date: { gte: monthStart, lte: monthEnd } } })
      .then((rows) => rows.reduce((sum, a) => sum + a.amount, 0)),
    getOutstandingAdvanceTotal(payroll.teacherId),
  ]);

  // Absence and Leave share one combined deduction bucket, computed at an identical per-day
  // rate — split it back out proportionally by day count so each row's amount is exact.
  const totalUnpaidDays = payroll.absentDays + payroll.unpaidLeaveDays;
  const perUnpaidDayDeduction = totalUnpaidDays > 0 ? payroll.leaveDeduction / totalUnpaidDays : 0;
  const absenceDeduction = perUnpaidDayDeduction * payroll.absentDays;
  const leaveDeductionAmount = perUnpaidDayDeduction * payroll.unpaidLeaveDays;

  const attendanceRows: { label: string; day: number; amount: number }[] = [
    { label: "Total Days", day: payroll.workingDays, amount: payroll.grossSalary },
    { label: "Absence", day: payroll.absentDays, amount: absenceDeduction },
    { label: "Half Day", day: payroll.halfDays, amount: payroll.halfDayDeduction },
    { label: "Late Punch", day: payroll.lateCount, amount: payroll.lateDeduction },
    { label: "Early Logout", day: 0, amount: 0 },
    { label: "Leave", day: payroll.unpaidLeaveDays, amount: leaveDeductionAmount },
  ];

  const deductionLineRows = [
    ...payroll.deductions.map((d) => ({ label: d.note ? `${d.type} — ${d.note}` : d.type, amount: d.amount })),
    ...(payroll.statutoryDeductionsTotal > 0 ? [{ label: "Statutory (PF/ESIC/PT)", amount: payroll.statutoryDeductionsTotal }] : []),
  ];

  const bonusSum = payroll.bonuses.reduce((sum, b) => sum + b.amount, 0);

  const netPaymentPreAdvance =
    payroll.grossSalary - payroll.leaveDeduction - payroll.halfDayDeduction - payroll.lateDeduction - payroll.otherDeductionsTotal + bonusSum;
  const subTotal = netPaymentPreAdvance + payroll.previousPending;
  const total = subTotal - payroll.advanceApplied;
  const balance = total - payroll.paidAmount;

  const srNoStart = attendanceRows.length + 1;

  return (
    <div className="min-h-screen bg-slate-100 py-8 print:bg-white print:py-0">
      <div className="mx-auto mb-4 max-w-3xl px-4 print:hidden">
        <PrintDownloadActions targetId="print-content" fileName={`Salary-Slip-${payroll.invoiceNo}`} />
      </div>

      <div
        id="print-content"
        className="mx-auto max-w-3xl bg-white p-4 shadow-lg ring-1 ring-slate-200 print:p-6 print:shadow-none print:ring-0"
      >
        <table className="w-full border-collapse border border-slate-900 text-sm">
          <colgroup>
            <col className="w-[12%]" />
            <col className="w-[43%]" />
            <col className="w-[15%]" />
            <col className="w-[30%]" />
          </colgroup>
          <tbody>
            <tr>
              <td className="border border-slate-900 p-2 font-semibold whitespace-nowrap">Teacher Name :-</td>
              <td className="border border-slate-900 p-2 text-center font-bold tracking-wide text-purple-800 uppercase" colSpan={3}>
                {payroll.teacher.name}
              </td>
            </tr>
            <tr>
              <td className="border border-slate-900 p-2 font-semibold whitespace-nowrap">Designation :-</td>
              <td className="border border-slate-900 p-2">{payroll.teacher.designation || "Teacher"}</td>
              <td className="border border-slate-900 p-2 font-semibold whitespace-nowrap">Invoice No :-</td>
              <td className="border border-slate-900 p-2">{payroll.invoiceNo}</td>
            </tr>
            <tr>
              <td className="border border-slate-900 p-2 font-semibold whitespace-nowrap">Month : -</td>
              <td className="border border-slate-900 p-2">{monthName}</td>
              <td className="border border-slate-900 p-2 font-semibold whitespace-nowrap">Date :-</td>
              <td className="border border-slate-900 p-2">
                {new Date(payroll.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" })}
              </td>
            </tr>
            <tr>
              <td className="border border-slate-900 p-2 font-semibold whitespace-nowrap">Salary :</td>
              <td className="border border-slate-900 p-2">{formatNumber(payroll.grossSalary)}</td>
              <td className="border border-slate-900 p-2 font-semibold whitespace-nowrap">Working</td>
              <td className="border border-slate-900 p-2">{workingRange}</td>
            </tr>

            <tr className="bg-sky-100">
              <td className="border border-slate-900 p-2 text-center font-semibold">Sr No</td>
              <td className="border border-slate-900 p-2 text-center font-semibold">Details</td>
              <td className="border border-slate-900 p-2 text-center font-semibold">Day</td>
              <td className="border border-slate-900 p-2 text-center font-semibold">Pement</td>
            </tr>

            {attendanceRows.map((row, i) => (
              <tr key={row.label}>
                <td className="border border-slate-900 p-1.5 text-center">{i + 1}</td>
                <td className="border border-slate-900 p-1.5">{row.label}</td>
                <td className="border border-slate-900 p-1.5 text-center">{formatNumber(row.day)}</td>
                <td className="border border-slate-900 p-1.5 text-right">{formatNumber(row.amount)}</td>
              </tr>
            ))}

            <tr>
              <td className="border border-slate-900 p-1.5 text-center">{srNoStart}</td>
              <td className="border border-slate-900 p-0" colSpan={3}>
                {deductionLineRows.length === 0 ? (
                  <div className="p-1.5 text-slate-400">No deductions</div>
                ) : (
                  <table className="w-full border-collapse">
                    <colgroup>
                      <col className="w-[55%]" />
                      <col className="w-[45%]" />
                    </colgroup>
                    <tbody>
                      {deductionLineRows.map((row, i) => (
                        <tr key={`${row.label}-${i}`} className="bg-red-600 text-white">
                          <td className={`p-1.5 font-medium ${i > 0 ? "border-t border-red-400" : ""}`}>{row.label}</td>
                          <td className={`p-1.5 text-right font-medium ${i > 0 ? "border-t border-red-400" : ""}`}>
                            {formatNumber(row.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </td>
            </tr>

            {payroll.bonuses.map((b, i) => (
              <tr key={b.id} className="bg-emerald-500 text-white">
                <td className="border border-slate-900 p-1.5 text-center">{srNoStart + 1 + i}</td>
                <td className="border border-slate-900 p-1.5 font-medium" colSpan={2}>
                  Bonus — {b.type}{b.note ? ` (${b.note})` : ""}
                </td>
                <td className="border border-slate-900 p-1.5 text-right font-medium">{formatNumber(b.amount)}</td>
              </tr>
            ))}

            <tr className="font-semibold">
              <td className="border border-slate-900 p-2" colSpan={3}>
                Net Pement
              </td>
              <td className="border border-slate-900 p-2 text-right">{formatNumber(netPaymentPreAdvance)}</td>
            </tr>

            <tr>
              <td className="border border-slate-900 bg-green-200 p-2 font-semibold" colSpan={2}>
                Advance Pement Rs. {formatNumber(advanceGivenThisMonth)}
              </td>
              <td className="border border-slate-900 p-2 font-semibold whitespace-nowrap">Last Month Pending</td>
              <td className="border border-slate-900 p-2 text-right">{formatNumber(payroll.previousPending)}</td>
            </tr>
            <tr>
              <td className="border border-slate-900 bg-green-200 p-2 font-semibold" colSpan={2}>
                Advance Remening Rs. {formatNumber(advanceRemaining)}
              </td>
              <td className="border border-slate-900 bg-amber-100 p-2 font-semibold">Sub Total</td>
              <td className="border border-slate-900 bg-amber-100 p-2 text-right font-semibold">{formatNumber(subTotal)}</td>
            </tr>

            <tr>
              <td className="border border-slate-900 p-2 align-top font-semibold" rowSpan={4}>
                Invoice Amount In Word
              </td>
              <td className="border border-slate-900 p-2 align-top text-xs italic" rowSpan={4}>
                {amountToWords(total)}
              </td>
              <td className="border border-slate-900 p-2 font-semibold">Advance Deduction</td>
              <td className="border border-slate-900 p-2 text-right">{formatNumber(payroll.advanceApplied)}</td>
            </tr>
            <tr>
              <td className="border border-slate-900 p-2 font-semibold">Total</td>
              <td className="border border-slate-900 p-2 text-right font-semibold">{formatNumber(total)}</td>
            </tr>
            <tr>
              <td className="border border-slate-900 p-2 font-semibold">Paid</td>
              <td className="border border-slate-900 p-2 text-right">{formatNumber(payroll.paidAmount)}</td>
            </tr>
            <tr>
              <td className="border border-slate-900 bg-blue-200 p-3 text-base font-bold">Balance</td>
              <td className="border border-slate-900 bg-blue-200 p-3 text-right text-lg font-bold">{formatNumber(balance)}</td>
            </tr>

            <tr>
              <td className="border border-slate-900 p-4 text-center" colSpan={4}>
                For :- {settings?.name || "School Name"}
                {settings?.address ? `, ${settings.address}` : ""}.
              </td>
            </tr>
            <tr>
              <td className="border border-slate-900 p-10" colSpan={4} />
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
