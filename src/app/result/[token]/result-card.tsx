import { DocumentHeader } from "@/components/document-header";
import { DocumentWatermark } from "@/components/document-watermark";
import { formatDate, formatNumber, numberToWords } from "@/lib/utils";

type ResultRow = { subjectName: string; marksObtained: number; totalMarks: number };

const PASS_PERCENT = 35;

function grade(percentage: number) {
  if (percentage >= 75) return "A";
  if (percentage >= 60) return "B";
  if (percentage >= PASS_PERCENT) return "C";
  return "F";
}

function ordinal(n: number): string {
  const v = n % 100;
  if (v >= 11 && v <= 13) return `${n}th`;
  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}

export function ResultCard({
  schoolName,
  address,
  phone,
  studentName,
  motherName,
  standardName,
  examName,
  resultDate,
  rows,
  totalObtained,
  totalMax,
  percentage,
  rank,
  totalStudents,
}: {
  schoolName: string;
  address: string | null;
  phone: string | null;
  studentName: string;
  motherName: string | null;
  standardName: string;
  examName: string;
  resultDate: Date;
  rows: ResultRow[];
  totalObtained: number;
  totalMax: number;
  percentage: number;
  rank: number;
  totalStudents: number;
}) {
  // Result always shows as Pass, regardless of marks scored.
  const overallPass = true;

  return (
    <div
      id="exam-result-card"
      className="relative mx-auto box-border overflow-hidden rounded-2xl border-8 border-blue-950 bg-pink-50 p-5 shadow-lg ring-1 ring-slate-200 sm:p-6 print:w-[190mm] print:min-h-[277mm] print:shadow-none print:ring-0 [-webkit-print-color-adjust:exact] [print-color-adjust:exact]"
    >
      <DocumentWatermark />

      <div className="relative z-10">
        <DocumentHeader docType="Statement of Marks" schoolName={schoolName} address={address} phone={phone} />

        <p className="mt-3 text-center text-sm font-bold text-slate-800">Exam: {examName}</p>

        <div className="mt-3 grid grid-cols-3 gap-2 rounded-lg bg-blue-950 px-3 py-2.5 text-center [-webkit-print-color-adjust:exact] [print-color-adjust:exact]">
          <div>
            <p className="text-[10px] font-medium tracking-wide text-blue-200 uppercase">Student Name</p>
            <p className="mt-0.5 text-base font-bold text-white">{studentName}</p>
          </div>
          <div>
            <p className="text-[10px] font-medium tracking-wide text-blue-200 uppercase">Standard</p>
            <p className="mt-0.5 text-base font-bold text-white">{standardName}</p>
          </div>
          <div>
            <p className="text-[10px] font-medium tracking-wide text-blue-200 uppercase">Mother&apos;s Name</p>
            <p className="mt-0.5 text-base font-bold text-white">{motherName || "-"}</p>
          </div>
        </div>

        <table className="mt-5 w-full border-collapse overflow-hidden rounded-lg border border-blue-950 text-sm">
          <thead>
            <tr className="bg-pink-600 text-xs font-semibold tracking-wide text-white uppercase">
              <th className="border-r border-pink-500 px-3 py-2 text-left">Subject</th>
              <th className="border-r border-pink-500 px-3 py-2 text-center">Marks Obtained</th>
              <th className="border-r border-pink-500 px-3 py-2 text-center font-bold">Total Marks</th>
              <th className="px-3 py-2 text-center">Grade</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const subjectPercentage = r.totalMarks > 0 ? (r.marksObtained / r.totalMarks) * 100 : 0;
              return (
                <tr key={r.subjectName} className={`border-b border-slate-200 ${i % 2 === 1 ? "bg-slate-50" : ""}`}>
                  <td className="border-r border-slate-200 px-3 py-2.5 font-medium text-slate-900">
                    {r.subjectName}
                  </td>
                  <td className="border-r border-slate-200 px-3 py-2.5 text-center text-slate-700">
                    {formatNumber(r.marksObtained)}
                  </td>
                  <td className="border-r border-slate-200 px-3 py-2.5 text-center font-bold text-slate-800">
                    {formatNumber(r.totalMarks)}
                  </td>
                  <td className="px-3 py-2.5 text-center font-semibold text-slate-700">
                    {grade(subjectPercentage)}
                  </td>
                </tr>
              );
            })}
            <tr className="bg-emerald-200 font-bold text-slate-900">
              <td className="border-r border-slate-200 px-3 py-2.5">Total</td>
              <td className="border-r border-slate-200 px-3 py-2.5 text-center">{formatNumber(totalObtained)}</td>
              <td className="border-r border-slate-200 px-3 py-2.5 text-center">{formatNumber(totalMax)}</td>
              <td className="px-3 py-2.5 text-center">{grade(percentage)}</td>
            </tr>
          </tbody>
        </table>

        <div className="mt-3 flex items-center justify-between gap-3">
          <p className="text-xs text-slate-500">
            Marks obtained in words: <span className="font-medium text-slate-700">{numberToWords(totalObtained)}</span>
          </p>
          <span
            className={`shrink-0 rounded-full px-3 py-1 text-sm font-bold tracking-wide uppercase ${
              overallPass ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
            }`}
          >
            {overallPass ? "Pass" : "Fail"}
          </span>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2.5 text-center text-sm">
          <div className="rounded-lg border border-blue-950/20 bg-white py-2.5">
            <p className="text-[11px] font-medium tracking-wide text-slate-400 uppercase">Percentage</p>
            <p className="mt-0.5 font-bold text-slate-900">{percentage.toFixed(2)}%</p>
          </div>
          <div className="rounded-lg border border-blue-950/20 bg-white py-2.5">
            <p className="text-[11px] font-medium tracking-wide text-slate-400 uppercase">Grade</p>
            <p className="mt-0.5 font-bold text-slate-900">{grade(percentage)}</p>
          </div>
          <div className="rounded-lg border border-blue-950/20 bg-white py-2.5">
            <p className="text-[11px] font-medium tracking-wide text-slate-400 uppercase">Class Rank</p>
            <p className="mt-0.5 font-bold text-slate-900">
              {ordinal(rank)} / {totalStudents}
            </p>
          </div>
        </div>

        <p
          className={`mt-4 rounded-md border px-3 py-2 text-center text-xs font-semibold ${
            overallPass
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-amber-200 bg-amber-50 text-amber-700"
          }`}
        >
          {overallPass
            ? "Congratulations on your performance! Keep up the good work."
            : "Don't be discouraged — focus on your weak subjects and you'll do better next time!"}
        </p>

        <div className="mt-6 flex items-end justify-between text-xs">
          <p className="text-slate-400">Result declared on {formatDate(resultDate)}</p>
          <div className="text-center">
            <div className="mb-1 h-10 w-32 border-b border-slate-400" />
            <p className="font-semibold text-slate-800">Class Teacher / Principal</p>
          </div>
        </div>
      </div>
    </div>
  );
}
