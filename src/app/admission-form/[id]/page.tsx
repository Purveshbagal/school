import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getStudentFeeSummary } from "@/lib/fees";
import { formatDate } from "@/lib/utils";
import { PrintDownloadActions } from "@/components/print-download-actions";
import { DocumentHeader } from "@/components/document-header";
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

  const studentName = splitName(student.name);
  const fatherName = splitName(student.fatherName || "");
  const motherName = splitName(student.motherName || "");

  const inputBox = (label: string, value: string) => (
    <div>
      {label && <p className="mb-1 text-xs font-semibold text-slate-700">{label}</p>}
      <div className="min-h-[36px] rounded border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-800">
        {value || " "}
      </div>
    </div>
  );

  const radioRow = (label: string, options: string[], selected: string) => (
    <div>
      <p className="mb-1 text-xs font-semibold text-slate-700">{label}</p>
      <div className="flex items-center gap-4 pt-1.5">
        {options.map((option) => (
          <span key={option} className="flex items-center gap-1.5 text-sm text-slate-800">
            <span
              className={`inline-block h-3.5 w-3.5 rounded-full border border-slate-500 ${
                option === selected ? "bg-slate-700" : ""
              }`}
            />
            {option}
          </span>
        ))}
      </div>
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
        className="relative mx-auto max-w-3xl overflow-hidden bg-white p-4 shadow-lg ring-1 ring-slate-200 sm:p-8 print:p-10 print:shadow-none print:ring-0"
      >
        <DocumentWatermark />
        <div className="relative z-10">
          <DocumentHeader
            docType="Student Admission Form"
            schoolName={settings?.name || "School Name"}
            address={settings?.address}
            udise={settings?.udise}
            phone={settings?.phone}
            cornerLeft={settings?.udise ? `School Udise: ${settings.udise}` : undefined}
            topRight={
              student.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={student.photoUrl} alt="" className="h-16 w-14 rounded object-cover sm:h-20 sm:w-16" />
              ) : undefined
            }
          />

          <div className="mt-4 space-y-4">
            <div className="grid grid-cols-3 gap-3">
              {inputBox("Register Number:", student.admissionNo)}
              {inputBox("PEN ID:", student.penId || "")}
              {inputBox("APAAR ID:", student.apaarId || "")}
            </div>

            <div>
              <p className="mb-1 text-xs font-semibold text-slate-700">Full Name:</p>
              <div className="grid grid-cols-3 gap-3">
                {inputBox("", studentName.first)}
                {inputBox("", studentName.middle)}
                {inputBox("", studentName.last)}
              </div>
            </div>

            <div className="grid grid-cols-4 gap-3">
              {inputBox("Address:", student.address || "")}
              {inputBox("Village:", student.village || "")}
              {inputBox("Taluka:", student.taluka || "")}
              {inputBox("District:", student.district || "")}
            </div>

            <div className="grid grid-cols-4 gap-3">
              {inputBox("Date of Birth:", formatDate(student.dob))}
              {inputBox("Birth Place:", student.birthPlace || "")}
              {inputBox("Aadhar Number:", student.aadharNumber || "")}
              {radioRow("Gender:", ["Male", "Female"], student.gender || "")}
            </div>

            <div>
              <p className="mb-1 text-xs font-semibold text-slate-700">Father&apos;s Full Name:</p>
              <div className="grid grid-cols-3 gap-3">
                {inputBox("", fatherName.first)}
                {inputBox("", fatherName.middle)}
                {inputBox("", fatherName.last)}
              </div>
            </div>

            <div>
              <p className="mb-1 text-xs font-semibold text-slate-700">Mother&apos;s Full Name:</p>
              <div className="grid grid-cols-3 gap-3">
                {inputBox("", motherName.first)}
                {inputBox("", motherName.middle)}
                {inputBox("", motherName.last)}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {inputBox("Phone Number:", student.phone || "")}
              {inputBox("Mother Tongue:", student.motherTongue || "")}
            </div>

            <div className="grid grid-cols-3 gap-3">
              {inputBox("Religion:", student.religion || "")}
              {inputBox("Cast:", student.caste || "")}
              {inputBox("Sub Cast:", student.subCaste || "")}
            </div>

            <div className="grid grid-cols-4 gap-3">
              {inputBox("Class:", student.standard.name)}
              {inputBox("Medium:", student.medium || "")}
              {inputBox("Board:", student.board || "")}
              {inputBox("Academic Year:", student.academicYear)}
            </div>

            {radioRow("School Bus:", ["Yes", "No"], student.schoolBus ? "Yes" : "No")}

            <div className="flex items-start gap-2 pt-1">
              <span className="mt-0.5 inline-block h-4 w-4 shrink-0 border border-slate-500" />
              <p className="text-sm leading-snug text-slate-700">
                I hereby declare and certify that all the information provided above is true and
                accurate to the best of my knowledge.
              </p>
            </div>

            <div className="flex items-end justify-between pt-4 text-sm">
              <div>
                <p className="text-slate-700">Date Of Admission: {formatDate(student.admissionDate)}</p>
                <p className="text-slate-700">Place: {student.village || student.district || ""}</p>
              </div>
              <div className="text-center">
                <div className="mb-1 h-8 w-32 border-b border-slate-400" />
                <p className="text-slate-500">Parent&apos;s Sign</p>
              </div>
              <div className="text-center">
                <div className="mb-1 h-8 w-32 border-b border-slate-400" />
                <p className="text-slate-500">Principal</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
