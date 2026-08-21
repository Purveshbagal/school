import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getStudentFeeSummary } from "@/lib/fees";
import { prisma } from "@/lib/db";
import { formatCurrency } from "@/lib/utils";
import { PrintDownloadActions } from "@/components/print-download-actions";
import { DocumentHeader } from "@/components/document-header";

export default async function FeeStructurePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { id } = await params;

  const summary = await getStudentFeeSummary(id);
  if (!summary) notFound();

  const { student, standardFee, busFee, feeStructure, totalFee } = summary;
  const settings = await prisma.schoolSettings.findUnique({ where: { id: "main" } });

  const components = feeStructure?.components ?? [];
  const componentsTotal = components.reduce((sum, c) => sum + c.amount, 0);
  // Custom fee / discount can make the standard fee diverge from the sum of the
  // saved components — show the difference as its own line so the total still adds up.
  const adjustment = standardFee - componentsTotal;

  return (
    <div className="min-h-screen bg-slate-100 py-8 print:bg-white print:py-0">
      <div className="mx-auto mb-4 w-[148mm] max-w-full px-4 print:hidden">
        <PrintDownloadActions
          targetId="print-content"
          fileName={`Fee-Structure-${student.admissionNo}`}
          pdfFormat="a5"
          pdfOrientation="portrait"
        />
      </div>

      <div
        id="print-content"
        className="print-a5-portrait mx-auto box-border flex min-h-[210mm] w-[148mm] max-w-full flex-col bg-white p-6 shadow-lg ring-1 ring-slate-200 print:shadow-none print:ring-0"
      >
        <DocumentHeader
          docType="Fee Structure"
          schoolName={settings?.name || "School Name"}
          address={settings?.address}
          udise={settings?.udise}
          phone={settings?.phone}
        />

        <div className="mt-4 grid grid-cols-2 gap-y-1.5 text-xs">
          <div>
            <span className="text-slate-500">Student Name: </span>
            <span className="font-semibold">{student.name}</span>
          </div>
          <div className="text-right">
            <span className="text-slate-500">Register No: </span>
            <span className="font-semibold">{student.admissionNo}</span>
          </div>
          <div>
            <span className="text-slate-500">Standard: </span>
            <span className="font-semibold">{student.standard.name}</span>
          </div>
          <div className="text-right">
            <span className="text-slate-500">Academic Year: </span>
            <span className="font-semibold">{student.academicYear}</span>
          </div>
        </div>

        <table className="mt-4 w-full border-collapse overflow-hidden rounded-lg text-xs">
          <thead>
            <tr className="bg-blue-600 text-white">
              <th className="px-3 py-2 text-left font-medium">Fee Component</th>
              <th className="px-3 py-2 text-right font-medium">Amount</th>
            </tr>
          </thead>
          <tbody>
            {components.length === 0 ? (
              <tr>
                <td colSpan={2} className="px-3 py-3 text-center text-slate-400">
                  No fee structure set for this standard.
                </td>
              </tr>
            ) : (
              components.map((c) => (
                <tr key={c.id} className="border-b border-slate-200">
                  <td className="px-3 py-2">{c.name}</td>
                  <td className="px-3 py-2 text-right">{formatCurrency(c.amount)}</td>
                </tr>
              ))
            )}
            {Math.abs(adjustment) > 0.01 && (
              <tr className="border-b border-slate-200">
                <td className="px-3 py-2">{adjustment > 0 ? "Additional Charges" : "Discount"}</td>
                <td className="px-3 py-2 text-right">{formatCurrency(Math.abs(adjustment))}</td>
              </tr>
            )}
            {busFee > 0 && (
              <tr className="border-b border-slate-200">
                <td className="px-3 py-2">Bus Fee</td>
                <td className="px-3 py-2 text-right">{formatCurrency(busFee)}</td>
              </tr>
            )}
            <tr className="bg-slate-50 font-semibold">
              <td className="px-3 py-2">Total Amount</td>
              <td className="px-3 py-2 text-right">{formatCurrency(totalFee - summary.openingBalance)}</td>
            </tr>
          </tbody>
        </table>

        <p className="mt-4 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-center text-[11px] leading-relaxed font-semibold text-blue-800">
          वरील नमूद केलेले संपूर्ण शालेय शुल्क मला/आम्हाला मान्य असून, ते विहित मुदतीत भरण्याची जबाबदारी मी स्वीकारतो/स्वीकारते.
          <br />
          I/We accept the above school fee structure in full and undertake to pay it within the prescribed schedule.
        </p>

        <div className="mt-auto flex items-end justify-between pt-10 text-xs">
          <div className="text-center">
            <div className="mb-1 h-10 w-32 border-b border-slate-400" />
            <p className="text-slate-500">Parent/Student Sign</p>
          </div>
          <div className="text-center">
            <div className="mb-1 h-10 w-32 border-b border-slate-400" />
            <p className="text-slate-500">Teacher Sign</p>
          </div>
        </div>
      </div>
    </div>
  );
}
