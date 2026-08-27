import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getStudentFeeSummary } from "@/lib/fees";
import { formatDate } from "@/lib/utils";
import { PrintDownloadActions } from "@/components/print-download-actions";
import { DocumentWatermark } from "@/components/document-watermark";

export default async function AdmissionFormPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { id } = await params;
  const summary = await getStudentFeeSummary(id);
  if (!summary) notFound();

  const { student } = summary;
  const settings = await prisma.schoolSettings.findUnique({ where: { id: "main" } });

  // The reference form splits a full name into First / Middle / Last boxes. The Student
  // model stores a single `name` field, so this splits it purely for display.
  function splitName(fullName: string) {
    const parts = fullName.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return { first: "", middle: "", last: "" };
    if (parts.length === 1) return { first: parts[0], middle: "", last: "" };
    return { first: parts[0], middle: parts.slice(1, -1).join(" "), last: parts[parts.length - 1] };
  }
  function fullNameDisplay(fullName: string) {
    const { first, middle, last } = splitName(fullName);
    return [first, middle, last].filter(Boolean).join(" ") || "-";
  }

  const row = (no: number, label: string, value: string) => (
    <div className="grid grid-cols-12 gap-2 border-b border-slate-200 py-1.5 text-sm">
      <div className="col-span-1 text-slate-400">{no})</div>
      <div className="col-span-5 text-slate-500">{label}</div>
      <div className="col-span-6 font-semibold">{value || "-"}</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-100 py-8 print:bg-white print:py-0">
      <div className="mx-auto mb-4 max-w-3xl px-4 print:hidden">
        <PrintDownloadActions
          targetId="print-content"
          fileName={`Admission-Form-${student.admissionNo}`}
          backHref={`/students/${student.id}`}
        />
      </div>

      <div
        id="print-content"
        className="relative mx-auto max-w-3xl overflow-hidden bg-white p-4 shadow-lg ring-1 ring-slate-200 sm:p-8 print:p-12 print:shadow-none print:ring-0"
      >
        <DocumentWatermark />
        <div className="relative z-10">
          <div className="flex items-start justify-between text-xs text-slate-500">
            <div>{settings?.udise && `U-DISE No: ${settings.udise}`}</div>
            <div>Admission No: {student.admissionNo}</div>
          </div>

          <div className="mt-1 flex items-center gap-2 border-b-2 border-blue-700 pb-4 sm:gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/image/logo.jpeg"
              alt="School Logo"
              className="h-12 w-12 shrink-0 object-contain sm:h-20 sm:w-20"
            />
            <div className="min-w-0 flex-1 text-center">
              <h1 className="text-lg leading-tight font-bold text-slate-900 sm:text-2xl">{settings?.name || "School Name"}</h1>
              {settings?.address && <p className="text-xs text-slate-500 sm:text-sm">{settings.address}</p>}
            </div>
            {student.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={student.photoUrl} alt="" className="h-20 w-16 shrink-0 rounded object-cover" />
            ) : (
              <div className="hidden h-20 w-20 shrink-0 sm:block" />
            )}
          </div>

          <div className="mt-3 flex items-center justify-between">
            <span className="text-sm text-slate-500">Academic Year: {student.academicYear}</span>
            <h2 className="text-lg font-bold tracking-wide text-blue-700 uppercase">Student Admission Form</h2>
            <span className="w-[120px]" />
          </div>

          <div className="my-4 border-t border-dashed border-slate-300" />

          <div>
            {row(1, "Name of the Student in Full", fullNameDisplay(student.name))}
            {row(2, "Father's Name in Full", fullNameDisplay(student.fatherName || ""))}
            {row(3, "Mother's Name in Full", fullNameDisplay(student.motherName || ""))}
            {row(4, "Date of Birth & Birth Place", `${formatDate(student.dob)} — ${student.birthPlace || "-"}`)}
            {row(5, "Gender", student.gender || "")}
            {row(6, "Mother Tongue", student.motherTongue || "")}
            {row(7, "Religion", student.religion || "")}
            {row(8, "Caste", student.caste || "")}
            {row(9, "Sub-Caste", student.subCaste || "")}
            {row(10, "Address", `${student.address || "-"}, ${student.village || "-"}, Tal - ${student.taluka || "-"}, Dist - ${student.district || "-"}`)}
            {row(11, "Phone Number", student.phone || "")}
            {row(12, "Aadhar Card No", student.aadharNumber || "")}
            {row(13, "APAAR ID", student.apaarId || "")}
            {row(14, "PEN ID", student.penId || "")}
            {row(15, "Class, Medium & Board", `${student.standard.name} — ${student.medium || "-"} / ${student.board || "-"}`)}
            {row(16, "School Bus", student.schoolBus ? "Yes" : "No")}
            {row(17, "Date of Admission", formatDate(student.admissionDate))}
          </div>

          <p className="mt-5 text-sm text-slate-700">
            I hereby declare and certify that all the information provided above is true and accurate to the
            best of my knowledge.
          </p>

          <p className="mt-2 text-sm text-slate-700">
            Place: <span className="font-semibold">{student.village || student.district || "-"}</span>
          </p>

          <div className="mt-16 flex items-end justify-between text-sm">
            <div className="text-center">
              <div className="mb-1 h-10 w-32 border-b border-slate-400" />
              <p className="text-slate-500">Parent&apos;s Sign</p>
            </div>
            <div className="text-center">
              <div className="mb-1 h-10 w-32 border-b border-slate-400" />
              <p className="text-slate-500">Clerk</p>
            </div>
            <div className="text-center">
              <div className="mb-1 h-10 w-32 border-b border-slate-400" />
              <p className="text-slate-500">Principal (Sign &amp; Stamp)</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
