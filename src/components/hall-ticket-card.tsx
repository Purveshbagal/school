import { cn } from "@/lib/utils";
import { examMonthLabel, formatExamDateRange } from "@/lib/hall-tickets";
import { DocumentWatermark } from "@/components/document-watermark";

export type HallTicketData = {
  id: string;
  schoolName: string;
  schoolAddress: string | null;
  examName: string;
  examDate: Date;
  examEndDate: Date | null;
  studentName: string;
  standardName: string;
  photoUrl: string | null;
  seatNo: string;
  blockNo: string | null;
  centerName: string | null;
};

function Field({
  label,
  value,
  labelWidth,
  className,
}: {
  label: string;
  value?: string | null;
  labelWidth: string;
  className?: string;
}) {
  return (
    <div className={cn("flex items-baseline gap-2", className)}>
      <span className={cn("shrink-0 text-[12.5px] font-semibold tracking-wide text-slate-600 uppercase", labelWidth)}>
        {label}
      </span>
      <span className="shrink-0 text-[12.5px] font-semibold text-slate-500">:-</span>
      <span className="min-h-[24px] min-w-0 flex-1 border-b border-dotted border-slate-400 pb-0.5 text-[15.5px] leading-tight font-bold tracking-wide text-blue-900 uppercase">
        {/* nbsp keeps an empty field (Student Id) the same height/baseline as filled ones */}
        {value || " "}
      </span>
    </div>
  );
}

function Signature({ label }: { label: string }) {
  return (
    <div className="text-center">
      <div className="mb-1 h-9 w-40 border-b border-slate-500" />
      <p className="text-[12.5px] font-semibold tracking-wide text-slate-700">{label}</p>
    </div>
  );
}

/** One exam hall ticket, sized exactly to an A5 landscape page (210mm × 148mm) so
 * printing, the single-ticket PDF and the "Download All" PDF all map one ticket to one
 * page. Fixed px font sizes keep it identical on mobile, where the app shrinks the
 * Tailwind text scale. */
export function HallTicketCard({
  data,
  id,
  className,
}: {
  data: HallTicketData;
  id?: string;
  className?: string;
}) {
  const title = `${data.examName} Hall-Ticket ${examMonthLabel(data.examDate)}`;
  const centerName = data.centerName || data.schoolName;

  return (
    <div
      id={id}
      data-hall-ticket={data.id}
      className={cn("relative box-border h-[148mm] w-[210mm] overflow-hidden bg-white p-[6mm]", className)}
    >
      <div className="box-border h-full border-2 border-blue-900 p-[3px]">
        <div className="relative box-border flex h-full flex-col overflow-hidden border border-blue-900/40 px-7 pt-4 pb-4">
          <DocumentWatermark widthClassName="w-2/5" />

          <div className="relative z-10 flex h-full flex-col">
            <div className="flex items-center gap-3 border-b-2 border-blue-900 pb-2.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/image/logo.jpeg" alt="School Logo" className="h-14 w-14 shrink-0 object-contain" />
              <div className="min-w-0 flex-1 text-center">
                <h1
                  className={cn(
                    "font-serif leading-tight font-bold text-blue-900 uppercase",
                    // Long names (e.g. "… School & Jr. College") would otherwise wrap onto two lines.
                    data.schoolName.length > 30 ? "text-[21px] tracking-normal" : "text-[25px] tracking-wide"
                  )}
                >
                  {data.schoolName}
                </h1>
                {data.schoolAddress && (
                  <p className="mt-0.5 text-[11px] text-slate-500">{data.schoolAddress}</p>
                )}
              </div>
              <div className="h-14 w-14 shrink-0" />
            </div>

            <div className="mt-3 flex justify-center">
              <p className="rounded-sm bg-red-800 px-5 py-1 text-[15px] font-bold tracking-[0.12em] text-white uppercase">
                {title}
              </p>
            </div>

            <div className="mt-4 flex min-h-0 flex-1 gap-6">
              <div className="grid flex-1 grid-cols-[1.35fr_1fr] content-around gap-x-6">
                <Field label="Student Id" value="" labelWidth="w-[118px]" />
                <Field label="Standard" value={data.standardName} labelWidth="w-[78px]" />
                <Field label="Student Name" value={data.studentName} labelWidth="w-[118px]" className="col-span-2" />
                <Field label="Seat No" value={data.seatNo} labelWidth="w-[118px]" />
                <Field label="Block No" value={data.blockNo} labelWidth="w-[78px]" />
                <Field label="Center Name" value={centerName} labelWidth="w-[118px]" className="col-span-2" />
                <Field
                  label="Exam Date"
                  value={formatExamDateRange(data.examDate, data.examEndDate)}
                  labelWidth="w-[118px]"
                  className="col-span-2"
                />
              </div>

              <div className="flex shrink-0 items-start">
                <div className="box-border flex h-[38mm] w-[30mm] items-center justify-center overflow-hidden border-2 border-blue-900 bg-slate-50 p-0.5">
                  {data.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={data.photoUrl} alt={data.studentName} className="h-full w-full object-cover" />
                  ) : (
                    <span className="px-2 text-center text-[10px] leading-tight text-slate-400 uppercase">
                      Affix
                      <br />
                      Photo
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-3 flex items-end justify-end gap-16 pr-2">
              <Signature label="Class Teacher" />
              <Signature label="Principal" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
