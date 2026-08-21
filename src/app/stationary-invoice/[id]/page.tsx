import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatCurrency, formatDate, amountToWords } from "@/lib/utils";
import { PrintDownloadActions } from "@/components/print-download-actions";
import { DocumentHeader } from "@/components/document-header";

export default async function StationaryInvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { id } = await params;

  const sale = await prisma.stationarySale.findUnique({
    where: { id },
    include: { student: { include: { standard: true } }, items: true, payments: true },
  });
  if (!sale) notFound();

  const settings = await prisma.schoolSettings.findUnique({ where: { id: "main" } });
  const paidAmount = sale.payments.reduce((sum, p) => sum + p.amount, 0);
  const pendingAmount = Math.max(0, sale.totalAmount - paidAmount);

  return (
    <div className="min-h-screen bg-slate-100 py-8 print:bg-white print:py-0">
      <div className="mx-auto mb-4 max-w-2xl px-4 print:hidden">
        <PrintDownloadActions targetId="print-content" fileName={`Invoice-${sale.saleNo}`} />
      </div>

      <div
        id="print-content"
        className="mx-auto max-w-2xl bg-white p-8 shadow-lg ring-1 ring-slate-200 print:p-12 print:shadow-none print:ring-0"
      >
        <DocumentHeader
          docType="Stationary Sale Invoice"
          schoolName={settings?.name || "School Name"}
          address={settings?.address}
          udise={settings?.udise}
          phone={settings?.phone}
        />

        <div className="my-5 border-t border-dashed border-slate-300" />

        <div className="grid grid-cols-2 gap-y-2 text-sm">
          <div>
            <span className="text-slate-500">Invoice No: </span>
            <span className="font-semibold">{sale.saleNo}</span>
          </div>
          <div className="text-right">
            <span className="text-slate-500">Date: </span>
            <span className="font-semibold">{formatDate(sale.saleDate)}</span>
          </div>
          <div>
            <span className="text-slate-500">Student Name: </span>
            <span className="font-semibold">{sale.student.name}</span>
          </div>
          <div className="text-right">
            <span className="text-slate-500">Register Number: </span>
            <span className="font-semibold">{sale.student.admissionNo}</span>
          </div>
          <div>
            <span className="text-slate-500">Standard: </span>
            <span className="font-semibold">{sale.student.standard.name}</span>
          </div>
          <div className="text-right">
            <span className="text-slate-500">Payment Mode: </span>
            <span className="font-semibold">{sale.paymentMode}</span>
          </div>
        </div>

        <table className="mt-6 w-full border-collapse overflow-hidden rounded-lg text-sm">
          <thead>
            <tr className="bg-blue-600 text-white">
              <th className="px-3 py-2 text-left font-medium">Item</th>
              <th className="px-3 py-2 text-right font-medium">Qty</th>
              <th className="px-3 py-2 text-right font-medium">Price</th>
              <th className="px-3 py-2 text-right font-medium">Amount</th>
            </tr>
          </thead>
          <tbody>
            {sale.items.map((line) => (
              <tr key={line.id} className="border-b border-slate-200">
                <td className="px-3 py-2.5">{line.itemName}</td>
                <td className="px-3 py-2.5 text-right">{line.quantity}</td>
                <td className="px-3 py-2.5 text-right">{formatCurrency(line.price)}</td>
                <td className="px-3 py-2.5 text-right font-medium">{formatCurrency(line.amount)}</td>
              </tr>
            ))}
            <tr className={pendingAmount > 0 ? "border-b border-slate-200 bg-slate-50 font-semibold" : "bg-slate-50 font-semibold"}>
              <td className="px-3 py-2.5" colSpan={3}>
                Total Amount
              </td>
              <td className="px-3 py-2.5 text-right">{formatCurrency(sale.totalAmount)}</td>
            </tr>
            {pendingAmount > 0 && (
              <>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <td className="px-3 py-2 text-slate-500" colSpan={3}>
                    Amount Paid
                  </td>
                  <td className="px-3 py-2 text-right text-slate-500">
                    {formatCurrency(paidAmount)}
                  </td>
                </tr>
                <tr className="bg-slate-50 font-semibold text-destructive">
                  <td className="px-3 py-2" colSpan={3}>
                    Pending Amount
                  </td>
                  <td className="px-3 py-2 text-right">{formatCurrency(pendingAmount)}</td>
                </tr>
              </>
            )}
          </tbody>
        </table>

        <p className="mt-4 text-sm">
          <span className="text-slate-500">Amount in words: </span>
          <span className="font-medium italic">{amountToWords(sale.totalAmount)}</span>
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
      </div>
    </div>
  );
}
