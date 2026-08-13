import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatCurrency, formatDate, amountToWords } from "@/lib/utils";
import { PrintDownloadActions } from "@/components/print-download-actions";
import { DocumentHeader } from "@/components/document-header";

export default async function StationaryPaymentReceiptPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { id } = await params;

  const payment = await prisma.stationarySalePayment.findUnique({
    where: { id },
    include: { sale: { include: { student: { include: { standard: true } } } } },
  });
  if (!payment) notFound();

  const settings = await prisma.schoolSettings.findUnique({ where: { id: "main" } });

  const paymentsBefore = await prisma.stationarySalePayment.findMany({
    where: {
      saleId: payment.saleId,
      OR: [
        { paymentDate: { lt: payment.paymentDate } },
        { paymentDate: payment.paymentDate, createdAt: { lt: payment.createdAt } },
      ],
    },
  });
  const paidBefore = paymentsBefore.reduce((sum, p) => sum + p.amount, 0);
  const balanceAfter = payment.sale.totalAmount - paidBefore - payment.amount;

  return (
    <div className="min-h-screen bg-slate-100 py-8 print:bg-white print:py-0">
      <div className="mx-auto mb-4 max-w-2xl px-4 print:hidden">
        <PrintDownloadActions targetId="print-content" fileName={`Receipt-${payment.receiptNo}`} />
      </div>

      <div
        id="print-content"
        className="mx-auto max-w-2xl bg-white p-8 shadow-lg ring-1 ring-slate-200 print:p-12 print:shadow-none print:ring-0"
      >
        <DocumentHeader
          docType="Stationary Payment Receipt"
          schoolName={settings?.name || "School Name"}
          address={settings?.address}
          udise={settings?.udise}
          phone={settings?.phone}
        />

        <div className="my-5 border-t border-dashed border-slate-300" />

        <div className="grid grid-cols-2 gap-y-2 text-sm">
          <div>
            <span className="text-slate-500">Receipt No: </span>
            <span className="font-semibold">{payment.receiptNo}</span>
          </div>
          <div className="text-right">
            <span className="text-slate-500">Date: </span>
            <span className="font-semibold">{formatDate(payment.paymentDate)}</span>
          </div>
          <div>
            <span className="text-slate-500">Student Name: </span>
            <span className="font-semibold">{payment.sale.student.name}</span>
          </div>
          <div className="text-right">
            <span className="text-slate-500">Register Number: </span>
            <span className="font-semibold">{payment.sale.student.admissionNo}</span>
          </div>
          <div>
            <span className="text-slate-500">Sale No: </span>
            <span className="font-semibold">{payment.sale.saleNo}</span>
          </div>
          <div className="text-right">
            <span className="text-slate-500">Payment Mode: </span>
            <span className="font-semibold">{payment.mode}</span>
          </div>
        </div>

        <table className="mt-6 w-full border-collapse overflow-hidden rounded-lg text-sm">
          <thead>
            <tr className="bg-blue-600 text-white">
              <th className="px-3 py-2 text-left font-medium">Description</th>
              <th className="px-3 py-2 text-right font-medium">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-slate-200">
              <td className="px-3 py-2.5">
                Stationary payment{payment.remarks ? ` — ${payment.remarks}` : ""}
              </td>
              <td className="px-3 py-2.5 text-right font-medium">{formatCurrency(payment.amount)}</td>
            </tr>
            <tr className="border-b border-slate-200 bg-slate-50">
              <td className="px-3 py-2 text-slate-500">Sale Total Amount</td>
              <td className="px-3 py-2 text-right text-slate-500">
                {formatCurrency(payment.sale.totalAmount)}
              </td>
            </tr>
            <tr className="border-b border-slate-200 bg-slate-50">
              <td className="px-3 py-2 text-slate-500">Received Till Date</td>
              <td className="px-3 py-2 text-right text-slate-500">
                {formatCurrency(paidBefore + payment.amount)}
              </td>
            </tr>
            <tr className="bg-slate-50 font-semibold">
              <td className="px-3 py-2">{balanceAfter > 0 ? "Balance Due" : "Advance Balance"}</td>
              <td className="px-3 py-2 text-right">{formatCurrency(Math.abs(balanceAfter))}</td>
            </tr>
          </tbody>
        </table>

        <p className="mt-4 text-sm">
          <span className="text-slate-500">Amount in words: </span>
          <span className="font-medium italic">{amountToWords(payment.amount)}</span>
        </p>

        <div className="mt-14 flex items-end justify-between text-sm">
          <div className="text-center">
            <div className="mb-1 h-10 w-40 border-b border-slate-400" />
            <p className="text-slate-500">Student/Parent Sign</p>
          </div>
          <div className="text-center">
            <div className="mb-1 h-10 w-40 border-b border-slate-400" />
            <p className="text-slate-500">Authorized Signatory</p>
          </div>
        </div>
        <p className="mt-4 text-center text-xs text-slate-400">This is a computer generated receipt.</p>
      </div>
    </div>
  );
}
