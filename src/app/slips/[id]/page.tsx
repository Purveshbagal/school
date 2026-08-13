import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatCurrency, formatDate, amountToWords } from "@/lib/utils";
import { PrintDownloadActions } from "@/components/print-download-actions";
import { DocumentHeader } from "@/components/document-header";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default async function SlipPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { id } = await params;

  const slip = await prisma.salarySlip.findUnique({
    where: { id },
    include: { teacher: true },
  });
  if (!slip) notFound();

  const settings = await prisma.schoolSettings.findUnique({ where: { id: "main" } });

  const rows: [string, string | number, number][] = [
    ["Total Days", slip.totalDays, 0],
    ["Absence", slip.absentDays, 0],
    ["Half Day", slip.halfDays, 0],
    ["Late Punch", slip.latePunch, 0],
    ["Early Logout", slip.earlyLogout, 0],
    ["Leave", slip.leaveDays, 0],
    ["Other Deduction", "-", slip.otherDeduction],
  ];

  return (
    <div className="min-h-screen bg-slate-100 py-8 print:bg-white print:py-0">
      <div className="mx-auto mb-4 max-w-2xl px-4 print:hidden">
        <PrintDownloadActions targetId="print-content" fileName={`Salary-Slip-${slip.invoiceNo}`} />
      </div>

      <div
        id="print-content"
        className="mx-auto max-w-2xl bg-white p-8 shadow-lg ring-1 ring-slate-200 print:p-12 print:shadow-none print:ring-0"
      >
        <DocumentHeader
          docType="Salary Payment Slip"
          schoolName={settings?.name || "School Name"}
          address={settings?.address}
          udise={settings?.udise}
          phone={settings?.phone}
        />

        <div className="my-5 border-t border-dashed border-slate-300" />

        <div className="grid grid-cols-2 gap-y-2 text-sm">
          <div>
            <span className="text-slate-500">Invoice No: </span>
            <span className="font-semibold">{slip.invoiceNo}</span>
          </div>
          <div className="text-right">
            <span className="text-slate-500">Date: </span>
            <span className="font-semibold">{formatDate(slip.slipDate)}</span>
          </div>
          <div>
            <span className="text-slate-500">Teacher Name: </span>
            <span className="font-semibold">{slip.teacher.name}</span>
          </div>
          <div className="text-right">
            <span className="text-slate-500">Designation: </span>
            <span className="font-semibold">{slip.teacher.designation || "-"}</span>
          </div>
          <div>
            <span className="text-slate-500">Month: </span>
            <span className="font-semibold">
              {MONTHS[slip.month - 1]} {slip.year}
            </span>
          </div>
          <div className="text-right">
            <span className="text-slate-500">Working Hours: </span>
            <span className="font-semibold">{slip.workingHours || "-"}</span>
          </div>
          <div>
            <span className="text-slate-500">Monthly Salary: </span>
            <span className="font-semibold">{formatCurrency(slip.monthlySalary)}</span>
          </div>
        </div>

        <table className="mt-6 w-full border-collapse overflow-hidden rounded-lg text-sm">
          <thead>
            <tr className="bg-blue-600 text-white">
              <th className="px-3 py-2 text-left font-medium">Details</th>
              <th className="px-3 py-2 text-right font-medium">Days</th>
              <th className="px-3 py-2 text-right font-medium">Amount</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([label, days, amount]) => (
              <tr key={label} className="border-b border-slate-200">
                <td className="px-3 py-2 text-slate-600">{label}</td>
                <td className="px-3 py-2 text-right text-slate-600">{days}</td>
                <td className="px-3 py-2 text-right text-slate-600">
                  {amount ? formatCurrency(amount) : "-"}
                </td>
              </tr>
            ))}
            <tr className="border-b border-slate-200 bg-slate-50 font-semibold">
              <td className="px-3 py-2.5" colSpan={2}>
                Net Payment
              </td>
              <td className="px-3 py-2.5 text-right">{formatCurrency(slip.netPayment)}</td>
            </tr>
            <tr className="border-b border-slate-200">
              <td className="px-3 py-2" colSpan={2}>
                Advance Payment Given
              </td>
              <td className="px-3 py-2 text-right">{formatCurrency(slip.advanceGiven)}</td>
            </tr>
            <tr className="border-b border-slate-200">
              <td className="px-3 py-2" colSpan={2}>
                Last Month Pending
              </td>
              <td className="px-3 py-2 text-right">{formatCurrency(slip.lastMonthPending)}</td>
            </tr>
            <tr className="border-b border-slate-200 bg-amber-50 font-semibold">
              <td className="px-3 py-2.5" colSpan={2}>
                Sub Total
              </td>
              <td className="px-3 py-2.5 text-right">{formatCurrency(slip.subTotal)}</td>
            </tr>
            <tr className="border-b border-slate-200">
              <td className="px-3 py-2" colSpan={2}>
                Advance Deduction
              </td>
              <td className="px-3 py-2 text-right">- {formatCurrency(slip.advanceDeduction)}</td>
            </tr>
            <tr className="border-b border-slate-200 bg-blue-50 font-semibold">
              <td className="px-3 py-2.5" colSpan={2}>
                Total Payable
              </td>
              <td className="px-3 py-2.5 text-right">{formatCurrency(slip.total)}</td>
            </tr>
            <tr className="border-b border-slate-200">
              <td className="px-3 py-2" colSpan={2}>
                Paid
              </td>
              <td className="px-3 py-2 text-right">{formatCurrency(slip.paidAmount)}</td>
            </tr>
            <tr className="bg-slate-100 font-semibold">
              <td className="px-3 py-2.5" colSpan={2}>
                Balance
              </td>
              <td className="px-3 py-2.5 text-right">{formatCurrency(slip.balance)}</td>
            </tr>
          </tbody>
        </table>

        <p className="mt-4 text-sm">
          <span className="text-slate-500">Amount in words: </span>
          <span className="font-medium italic">{amountToWords(slip.total)}</span>
        </p>

        {slip.remarks && (
          <p className="mt-2 text-sm text-slate-500">Remarks: {slip.remarks}</p>
        )}

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
