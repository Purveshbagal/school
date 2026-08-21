import { DocumentHeader } from "@/components/document-header";
import { DocumentWatermark } from "@/components/document-watermark";
import { formatNumber } from "@/lib/utils";

type Term = { examName: string; examDate: Date; totalObtained: number; totalMax: number; percentage: number };

const PASS_PERCENT = 35;

function grade(percentage: number) {
  if (percentage >= 75) return "A";
  if (percentage >= 60) return "B";
  if (percentage >= PASS_PERCENT) return "C";
  return "F";
}

function GrowthChart({ terms }: { terms: Term[] }) {
  const width = 600;
  const height = 220;
  const padTop = 28;
  const padBottom = 44;
  const padLeft = 36;
  const padRight = 20;
  const plotWidth = width - padLeft - padRight;
  const plotHeight = height - padTop - padBottom;
  const GREEN = "#16a34a";
  const RED = "#dc2626";

  const clamp = (v: number) => Math.min(100, Math.max(0, v));
  const y = (v: number) => padTop + plotHeight - (clamp(v) / 100) * plotHeight;
  const x = (i: number) => (terms.length > 1 ? padLeft + (i / (terms.length - 1)) * plotWidth : padLeft + plotWidth / 2);

  const candleWidth = Math.min(36, plotWidth / Math.max(terms.length, 1) / 1.8);
  const baselineY = y(0);

  const candles = terms.map((t, i) => {
    const prev = i === 0 ? t.percentage : terms[i - 1].percentage;
    const up = t.percentage >= prev;
    return { cx: x(i), up, term: t };
  });

  const gridLines = [0, 20, 40, 60, 80, 100];

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" role="img" aria-label="Percentage per term, as bars rising from the baseline">
      {gridLines.map((g) => (
        <g key={g}>
          <line x1={padLeft} y1={y(g)} x2={width - padRight} y2={y(g)} stroke="#e2e8f0" strokeWidth={1} />
          <text x={padLeft - 6} y={y(g) + 3} textAnchor="end" fontSize={9} fill="#94a3b8">
            {g}
          </text>
        </g>
      ))}

      {candles.map((c, i) => {
        const color = c.up ? GREEN : RED;
        const top = y(c.term.percentage);
        const bodyHeight = Math.max(2, baselineY - top);
        return (
          <g key={i}>
            <rect
              x={c.cx - candleWidth / 2}
              y={top}
              width={candleWidth}
              height={bodyHeight}
              fill={color}
              stroke={color}
            />
            <text x={c.cx} y={top - 10} textAnchor="middle" fontSize={14} fontWeight="bold" fill="#1e293b">
              {c.term.percentage.toFixed(1)}%
            </text>
            <text x={c.cx} y={height - padBottom + 18} textAnchor="middle" fontSize={12} fontWeight="bold" fill="#334155">
              {c.term.examName.length > 12 ? `${c.term.examName.slice(0, 11)}…` : c.term.examName}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export function FinalResultCard({
  schoolName,
  address,
  phone,
  studentName,
  motherName,
  standardName,
  terms,
  totalObtained,
  totalMax,
  percentage,
}: {
  schoolName: string;
  address: string | null;
  phone: string | null;
  studentName: string;
  motherName: string | null;
  standardName: string;
  terms: Term[];
  totalObtained: number;
  totalMax: number;
  percentage: number;
}) {
  const overallPass = percentage >= PASS_PERCENT;
  const growth =
    terms.length > 1 ? terms[terms.length - 1].percentage - terms[0].percentage : 0;

  return (
    <div
      id="final-result-card"
      className="relative mx-auto box-border overflow-hidden rounded-2xl border-8 border-blue-950 bg-pink-50 p-5 shadow-lg ring-1 ring-slate-200 sm:p-6 print:w-[190mm] print:min-h-[277mm] print:shadow-none print:ring-0 [-webkit-print-color-adjust:exact] [print-color-adjust:exact]"
    >
      <DocumentWatermark />

      <div className="relative z-10">
        <DocumentHeader docType="Final Result" schoolName={schoolName} address={address} phone={phone} />

        <p className="mt-3 text-center text-sm font-bold text-slate-800">Combined Result — All Terms</p>

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
              <th className="border-r border-pink-500 px-3 py-2 text-left">Term / Exam</th>
              <th className="border-r border-pink-500 px-3 py-2 text-center">Marks Obtained</th>
              <th className="border-r border-pink-500 px-3 py-2 text-center font-bold">Total Marks</th>
              <th className="border-r border-pink-500 px-3 py-2 text-center">Percentage</th>
              <th className="px-3 py-2 text-center">Grade</th>
            </tr>
          </thead>
          <tbody>
            {terms.map((t, i) => (
              <tr key={t.examName} className={`border-b border-slate-200 ${i % 2 === 1 ? "bg-slate-50" : ""}`}>
                <td className="border-r border-slate-200 px-3 py-2.5 font-medium text-slate-900">{t.examName}</td>
                <td className="border-r border-slate-200 px-3 py-2.5 text-center text-slate-700">
                  {formatNumber(t.totalObtained)}
                </td>
                <td className="border-r border-slate-200 px-3 py-2.5 text-center font-bold text-slate-800">
                  {formatNumber(t.totalMax)}
                </td>
                <td className="border-r border-slate-200 px-3 py-2.5 text-center text-slate-700">
                  {t.percentage.toFixed(2)}%
                </td>
                <td className="px-3 py-2.5 text-center font-semibold text-slate-700">{grade(t.percentage)}</td>
              </tr>
            ))}
            <tr className="bg-emerald-200 font-bold text-slate-900">
              <td className="border-r border-slate-200 px-3 py-2.5">Overall</td>
              <td className="border-r border-slate-200 px-3 py-2.5 text-center">{formatNumber(totalObtained)}</td>
              <td className="border-r border-slate-200 px-3 py-2.5 text-center">{formatNumber(totalMax)}</td>
              <td className="border-r border-slate-200 px-3 py-2.5 text-center">{percentage.toFixed(2)}%</td>
              <td className="px-3 py-2.5 text-center">{grade(percentage)}</td>
            </tr>
          </tbody>
        </table>

        <div className="mt-3 flex justify-end">
          <span
            className={`rounded-full px-3 py-1 text-sm font-bold tracking-wide uppercase ${
              overallPass ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
            }`}
          >
            {overallPass ? "Pass" : "Fail"}
          </span>
        </div>

        <div className="mt-4 rounded-lg border border-blue-950/20 bg-white p-3">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-medium tracking-wide text-slate-400 uppercase">Performance Growth</p>
            {terms.length > 1 && (
              <p className={`text-xs font-bold ${growth >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                {growth >= 0 ? "+" : ""}
                {growth.toFixed(1)}% since {terms[0].examName}
              </p>
            )}
          </div>
          <div className="mt-2">
            <GrowthChart terms={terms} />
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
      </div>
    </div>
  );
}
