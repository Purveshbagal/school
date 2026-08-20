import { DocumentHeader } from "@/components/document-header";
import { DocumentWatermark } from "@/components/document-watermark";
import { formatNumber } from "@/lib/utils";

type ResultRow = { subjectName: string; marksObtained: number; totalMarks: number };

export function ResultCard({
  schoolName,
  studentName,
  standardName,
  examName,
  rows,
  totalObtained,
  totalMax,
  percentage,
}: {
  schoolName: string;
  studentName: string;
  standardName: string;
  examName: string;
  rows: ResultRow[];
  totalObtained: number;
  totalMax: number;
  percentage: number;
}) {
  return (
    <div
      id="exam-result-card"
      className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 [-webkit-print-color-adjust:exact] [print-color-adjust:exact]"
    >
      <DocumentWatermark />

      <div className="relative z-10">
        <DocumentHeader docType="Exam Result" schoolName={schoolName} />

        <div className="mt-4">
          <p className="text-lg font-bold text-slate-900">{studentName}</p>
          <p className="text-sm text-slate-500">
            {standardName} · {examName}
          </p>
        </div>

        <table className="mt-5 w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-xs font-semibold tracking-wide text-slate-400 uppercase">
              <th className="py-2 text-left">Subject</th>
              <th className="py-2 text-right">Marks Obtained</th>
              <th className="py-2 text-right">Total Marks</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.subjectName} className="border-b border-slate-100">
                <td className="py-2.5 font-medium text-slate-900">{r.subjectName}</td>
                <td className="py-2.5 text-right text-slate-700">{formatNumber(r.marksObtained)}</td>
                <td className="py-2.5 text-right text-slate-700">{formatNumber(r.totalMarks)}</td>
              </tr>
            ))}
            <tr className="border-b border-slate-100 bg-slate-50 font-semibold">
              <td className="py-2.5 text-slate-900">Total</td>
              <td className="py-2.5 text-right text-slate-900">{formatNumber(totalObtained)}</td>
              <td className="py-2.5 text-right text-slate-900">{formatNumber(totalMax)}</td>
            </tr>
            <tr className="bg-slate-50 font-semibold">
              <td className="py-2.5 text-slate-900" colSpan={2}>
                Percentage
              </td>
              <td className="py-2.5 text-right text-slate-900">{percentage.toFixed(2)}%</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
