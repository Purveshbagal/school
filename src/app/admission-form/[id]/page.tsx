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

  const fieldBox = (label: string, value: string, span: 1 | 2 = 1) => (
    <div className={span === 2 ? "col-span-2" : ""}>
      <p className="text-[10px] font-bold tracking-wide text-slate-700 uppercase">{label}</p>
      <p className="min-h-[20px] border-b border-slate-300 pb-1 text-sm font-medium text-slate-800">
        {value || " "}
      </p>
    </div>
  );

  const sectionTitle = (title: string) => (
    <p className="mt-2.5 mb-1 text-xs font-bold tracking-widest text-slate-900 uppercase first:mt-0">
      {title}
    </p>
  );

  return (
    <div className="min-h-screen bg-slate-100 py-8 print:bg-white print:py-0">
      <div className="mx-auto mb-4 max-w-3xl px-4 print:hidden">
        <PrintDownloadActions targetId="print-content" fileName={`Admission-Form-${student.admissionNo}`} />
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
        />

        {sectionTitle("Student Details")}
        <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
          {fieldBox("Register Number", student.admissionNo)}
          {fieldBox("Date of Admission", formatDate(student.admissionDate))}
          {fieldBox("Gender", student.gender || "")}
          {fieldBox("Full Name", student.name, 2)}
          {fieldBox("Date of Birth", formatDate(student.dob))}
          {fieldBox("Birth Place", student.birthPlace || "")}
          {fieldBox("Aadhar Card Number", student.aadharNumber || "")}
          {fieldBox("PEN ID", student.penId || "")}
          {fieldBox("APAAR ID", student.apaarId || "")}
        </div>

        {sectionTitle("Family & Background")}
        <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
          {fieldBox("Father's Name", student.fatherName || "")}
          {fieldBox("Mother's Name", student.motherName || "")}
          {fieldBox("Mobile Number", student.phone || "")}
          {fieldBox("Mother Tongue", student.motherTongue || "")}
          {fieldBox("Religion", student.religion || "")}
          {fieldBox("Caste", student.caste || "")}
          {fieldBox("Sub Caste", student.subCaste || "")}
        </div>

        {sectionTitle("Academic Details")}
        <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
          {fieldBox("Standard", student.standard.name)}
          {fieldBox("Medium", student.medium || "")}
          {fieldBox("Board", student.board || "")}
          {fieldBox("Academic Year", student.academicYear)}
          {fieldBox("School Bus", student.schoolBus ? "Yes" : "No")}
        </div>

        {sectionTitle("Address")}
        <div className="grid grid-cols-1">{fieldBox("Residential Address", student.address || "")}</div>
        <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
          {fieldBox("Village", student.village || "")}
          {fieldBox("Taluka", student.taluka || "")}
          {fieldBox("District", student.district || "")}
        </div>

        <p className="mt-4 text-sm leading-relaxed text-slate-600">
          I hereby declare and certify that all the information provided above is true and
          accurate to the best of my knowledge.
        </p>

        <div className="mt-8 flex items-end justify-between text-sm">
          <div className="text-center">
            <div className="mb-1 h-8 w-40 border-b border-slate-400" />
            <p className="text-slate-500">Parent&apos;s Sign</p>
          </div>
          <div className="text-center">
            <div className="mb-1 h-8 w-40 border-b border-slate-400" />
            <p className="text-slate-500">Principal&apos;s Sign</p>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}
